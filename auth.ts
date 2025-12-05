import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Rate limiting map for login attempts
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number) {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, resetTime: record.resetTime };
  }

  record.count++;
  return { allowed: true };
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean every minute

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        // Rate limiting for login attempts - very generous for mod servers and high traffic
        const ip = request?.headers?.get('x-forwarded-for') ||
          request?.headers?.get('x-real-ip') || 'unknown';
        const rateLimit = checkRateLimit(`login:${ip}`, 500, 15 * 60 * 1000);

        if (!rateLimit.allowed) {
          throw new Error('Too many login attempts. Please try again later.');
        }

        try {
          // Find user by username
          const user = await db.query.users.findFirst({
            where: eq(users.username, credentials.username as string),
          });

          if (!user) {
            return null;
          }

          // Check if account is locked
          if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
            throw new Error('Account is temporarily locked. Please try again later.');
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isValidPassword) {
            // Increment failed login attempts
            await db
              .update(users)
              .set({
                failedLoginAttempts: (user.failedLoginAttempts || 0) + 1,
                lockedUntil: (user.failedLoginAttempts || 0) >= 4
                  ? new Date(Date.now() + 30 * 60 * 1000) // Lock for 30 minutes after 5 failed attempts
                  : null,
              })
              .where(eq(users.id, user.id));
            return null;
          }

          // Reset failed login attempts on successful login
          await db
            .update(users)
            .set({
              failedLoginAttempts: 0,
              lockedUntil: null,
              lastLoginAt: new Date(),
              lastLoginIp: ip,
            })
            .where(eq(users.id, user.id));

          return {
            id: user.id.toString(),
            username: user.username,
            name: user.username,
            email: user.email || undefined,
            role: user.role,
            minecraftUsername: user.minecraftUsername || undefined,
            minecraftUuid: user.minecraftUuid || undefined,
            avatar: user.avatar || undefined,
            xp: user.xp || 0,
            level: user.level || 1,
            websiteXp: user.websiteXp || 0,
            minecraftXp: user.minecraftXp || 0,
          };
        } catch (error) {
          console.error('Authentication error:', error);
          throw error;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.role = (user as any).role;
        token.minecraftUsername = (user as any).minecraftUsername;
        token.minecraftUuid = (user as any).minecraftUuid;
        token.avatar = (user as any).avatar;
        token.email = (user as any).email ?? token.email;
        (token as any).bio = (user as any).bio ?? (token as any).bio;
        token.xp = (user as any).xp;
        token.level = (user as any).level;
        token.websiteXp = (user as any).websiteXp;
        token.minecraftXp = (user as any).minecraftXp;
      }

      // When session.update() is called from the client (e.g. in /settings),
      // propagate updated fields like email, bio, avatar into the JWT.
      if (trigger === 'update' && session?.user) {
        const sUser = session.user as any;

        if (typeof sUser.email !== 'undefined') {
          token.email = sUser.email;
        }
        if (typeof sUser.avatar !== 'undefined') {
          token.avatar = sUser.avatar;
        }
        if (typeof sUser.username !== 'undefined') {
          token.username = sUser.username;
        }
        if (typeof sUser.bio !== 'undefined') {
          (token as any).bio = sUser.bio;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).username = token.username as string | undefined;
        (session.user as any).role = token.role as string;
        (session.user as any).minecraftUsername = token.minecraftUsername as string | undefined;
        (session.user as any).minecraftUuid = token.minecraftUuid as string | undefined;
        (session.user as any).avatar = token.avatar as string | undefined;
        session.user.email = (token.email as string | undefined) ?? session.user.email;
        (session.user as any).bio = (token as any).bio as string | undefined;
        (session.user as any).xp = token.xp as number;
        (session.user as any).level = token.level as number;
        (session.user as any).websiteXp = token.websiteXp as number;
        (session.user as any).minecraftXp = token.minecraftXp as number;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      console.log('User signed in:', { userId: user.id });
    },
  },
  // Suppress noisy JWT errors from stale cookies
  logger: {
    error: (error) => {
      // Suppress JWT decryption errors (stale cookies with old secret)
      if (error.name === 'JWTSessionError' ||
        error.message?.includes('decryption') ||
        error.message?.includes('JWE')) {
        // Silently ignore - user just needs to log in again
        return;
      }
      console.error('[auth] Error:', error);
    },
    warn: (code) => {
      // Suppress warnings in production (stale token issues, etc.)
      if (process.env.NODE_ENV === 'production') return;
      console.warn('[auth] Warning:', code);
    },
    debug: () => { }, // Disable debug logs in production
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});

