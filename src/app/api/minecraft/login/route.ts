import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users, apiKeys, donationRanks } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { formatUUID } from '@/lib/minecraft';

// Verify API key from Minecraft server/mod
async function verifyApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey) return false;

  try {
    const key = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.key, apiKey),
    });
    return !!key;
  } catch {
    return false;
  }
}

/**
 * POST /api/minecraft/login
 * Authenticate a player from the Minecraft auth mod
 * Returns user info including donation rank if present
 * 
 * Headers:
 *   X-API-Key: <api-key>
 * 
 * Body:
 *   username: string
 *   password: string
 * 
 * Response:
 *   success: boolean
 *   user?: { id, username, minecraftUsername, role, level, xp, donationRank }
 *   error?: string
 */
export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key required' },
        { status: 401 }
      );
    }

    const isValidKey = await verifyApiKey(apiKey);
    if (!isValidKey) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    // Accept both snake_case (from mod) and camelCase
    const minecraft_username = body.minecraft_username || body.minecraftUsername;
    let minecraft_uuid = body.minecraft_uuid || body.minecraftUuid;
    const { password } = body;

    // Normalize UUID format (ensure it has dashes)
    if (minecraft_uuid) {
      minecraft_uuid = formatUUID(minecraft_uuid);
    }

    console.log(`[Login] Received request - Username: ${minecraft_username}, UUID: ${minecraft_uuid}`);

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    if (!minecraft_username && !minecraft_uuid) {
      return NextResponse.json(
        { success: false, error: 'Minecraft username or UUID is required' },
        { status: 400 }
      );
    }

    // Find user by Minecraft UUID first (more reliable), then by username
    // Also check website username for imported users who don't have minecraftUsername set
    let user = null;
    console.log(`[Login] Looking up user - UUID: ${minecraft_uuid}, Username: ${minecraft_username}`);

    // 1. Try by Minecraft UUID
    if (minecraft_uuid) {
      user = await db.query.users.findFirst({
        where: eq(users.minecraftUuid, minecraft_uuid),
      });
      if (user) {
        console.log(`[Login] Found user by UUID: ${user.username} (ID: ${user.id})`);
      }
    }

    // 2. Try by Minecraft username field (case-insensitive)
    if (!user && minecraft_username) {
      user = await db.query.users.findFirst({
        where: sql`LOWER(${users.minecraftUsername}) = LOWER(${minecraft_username})`,
      });
      if (user) {
        console.log(`[Login] Found user by Minecraft username: ${user.username} (ID: ${user.id})`);
      }
    }

    // 3. Try by website username (for imported users without minecraftUsername) - case-insensitive
    if (!user && minecraft_username) {
      user = await db.query.users.findFirst({
        where: sql`LOWER(${users.username}) = LOWER(${minecraft_username})`,
      });
      if (user) {
        console.log(`[Login] Found user by website username: ${user.username} (ID: ${user.id})`);

        // Update the user's minecraft fields if they're missing
        if (!user.minecraftUuid && minecraft_uuid) {
          console.log(`[Login] Updating missing Minecraft fields for user ${user.username}`);
          await db.update(users)
            .set({
              minecraftUuid: minecraft_uuid,
              minecraftUsername: minecraft_username
            })
            .where(eq(users.id, user.id));
        }
      }
    }

    if (!user) {
      console.log(`[Login] No user found for UUID: ${minecraft_uuid}, Username: ${minecraft_username}`);
      return NextResponse.json({
        success: false,
        error: 'Invalid username or password',
      }, { status: 401 });
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json({
        success: false,
        error: `Account is locked. Try again in ${remainingMinutes} minutes.`,
      }, { status: 403 });
    }

    // Verify password
    console.log(`[Login] Verifying password for user ${user.username}`);
    console.log(`[Login] Password hash stored: ${user.password ? `${user.password.substring(0, 20)}... (length: ${user.password.length})` : 'NULL/EMPTY!'}`);
    console.log(`[Login] Password provided length: ${password?.length || 0}`);

    // Check if password exists
    if (!user.password) {
      console.log(`[Login] User ${user.username} has no password set!`);
      return NextResponse.json({
        success: false,
        error: 'Account not properly set up. Please use /register <password> to set your password.',
      }, { status: 401 });
    }

    // Check if password looks like a bcrypt hash
    if (!user.password.startsWith('$2')) {
      console.log(`[Login] User ${user.username} has non-bcrypt password hash! (starts with: ${user.password.substring(0, 5)})`);
      return NextResponse.json({
        success: false,
        error: 'Account requires password reset. Please use /register <password> to set a new password.',
      }, { status: 401 });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log(`[Login] Password validation result: ${isValidPassword}`);

    if (!isValidPassword) {
      console.log(`[Login] Password mismatch for user ${user.username}`);
      // Increment failed login attempts
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      const updates: any = { failedLoginAttempts: newAttempts };

      // Lock account after 5 failed attempts for 15 minutes
      if (newAttempts >= 5) {
        updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      await db.update(users).set(updates).where(eq(users.id, user.id));

      return NextResponse.json({
        success: false,
        error: 'Invalid username or password',
      }, { status: 401 });
    }

    console.log(`[Login] Login successful for user ${user.username}`);

    // Reset failed attempts on successful login
    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Get donation rank details if user has one
    let donationRank = null;
    if (user.donationRankId) {
      const rank = await db.query.donationRanks.findFirst({
        where: eq(donationRanks.id, user.donationRankId),
      });

      if (rank) {
        // Check if rank is expired
        const isExpired = user.rankExpiresAt && user.rankExpiresAt < new Date();
        const isPaused = user.rankPaused;

        donationRank = {
          id: rank.id,
          name: rank.name,
          color: rank.color,
          expiresAt: user.rankExpiresAt?.toISOString() || null,
          isExpired,
          isPaused,
        };
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        // Include both camelCase and snake_case for compatibility
        minecraftUsername: user.minecraftUsername,
        minecraftUuid: user.minecraftUuid,
        minecraft_username: user.minecraftUsername,
        minecraft_uuid: user.minecraftUuid,
        role: user.role,
        level: user.level,
        xp: user.xp,
        totalDonated: user.totalDonated || 0,
        total_donated: user.totalDonated || 0,
        donationRank,
        donation_rank_id: user.donationRankId,
        donation_rank: donationRank ? {
          id: donationRank.id,
          name: donationRank.name,
          color: donationRank.color,
          expires_at: donationRank.expiresAt,
        } : null,
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to authenticate' },
      { status: 500 }
    );
  }
}
