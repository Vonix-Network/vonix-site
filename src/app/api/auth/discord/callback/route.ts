import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/db';
import { siteSettings, users } from '@/db/schema';
import { inArray, eq } from 'drizzle-orm';
import { auth, signIn } from '../../../../../../auth';

// Helper to get correct origin with HTTPS for production
async function getOrigin(): Promise<string> {
    const headersList = await headers();
    const host = headersList.get('x-forwarded-host') || headersList.get('host') || '';
    const proto = host.includes('localhost') ? 'http' : 'https';
    return `${proto}://${host}`;
}

/**
 * GET /api/auth/discord/callback
 * Handles Discord OAuth callback, exchanges code for token, and links/logs in user
 */
export async function GET(request: Request) {
    // Get correct origin for redirects (outside try so it's available in catch)
    const origin = await getOrigin();

    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
            return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, origin));
        }

        if (!code) {
            return NextResponse.redirect(new URL('/login?error=No%20authorization%20code', origin));
        }

        // Parse state to get callbackUrl
        let callbackUrl = '/settings';
        if (state) {
            try {
                const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
                callbackUrl = stateData.callbackUrl || '/settings';
            } catch {
                // Use default
            }
        }

        // Fetch Discord credentials from database
        const settings = await db
            .select()
            .from(siteSettings)
            .where(inArray(siteSettings.key, [
                'discord_client_id',
                'discord_client_secret',
            ]));

        const settingsMap = Object.fromEntries(
            settings.map(s => [s.key, s.value])
        );

        const clientId = settingsMap['discord_client_id'];
        const clientSecret = settingsMap['discord_client_secret'];

        if (!clientId || !clientSecret) {
            return NextResponse.redirect(new URL('/login?error=Discord%20not%20configured', origin));
        }

        // Build redirect URI with correct HTTPS protocol
        const redirectUri = `${origin}/api/auth/discord/callback`;

        // Exchange code for token
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('Discord token exchange failed:', errorData);
            return NextResponse.redirect(new URL('/login?error=Failed%20to%20authenticate%20with%20Discord', origin));
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Fetch user info from Discord
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!userResponse.ok) {
            return NextResponse.redirect(new URL('/login?error=Failed%20to%20get%20Discord%20user%20info', origin));
        }

        const discordUser = await userResponse.json();
        const discordId = discordUser.id;
        const discordUsername = discordUser.username;
        const discordAvatar = discordUser.avatar
            ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png`
            : null;

        // Check if current user is logged in (linking flow)
        const session = await auth();

        if (session?.user?.id) {
            // User is logged in - link Discord to their account
            const userId = parseInt(session.user.id);

            // Check if this Discord is already linked to another account
            const existingUser = await db.query.users.findFirst({
                where: eq(users.discordId, discordId),
            });

            if (existingUser && existingUser.id !== userId) {
                return NextResponse.redirect(new URL('/settings?error=Discord%20already%20linked%20to%20another%20account', origin));
            }

            // Update the user's Discord info
            await db.update(users)
                .set({
                    discordId,
                    discordUsername,
                    discordAvatar,
                    updatedAt: new Date(),
                })
                .where(eq(users.id, userId));

            return NextResponse.redirect(new URL('/settings?success=Discord%20linked%20successfully', origin));
        } else {
            // User is not logged in - check if they have an account linked to this Discord
            const existingUser = await db.query.users.findFirst({
                where: eq(users.discordId, discordId),
            });

            if (existingUser) {
                // Log them in via NextAuth signIn
                // We'll redirect to a special login endpoint that accepts Discord ID
                const loginUrl = new URL('/api/auth/discord/login', origin);
                loginUrl.searchParams.set('discordId', discordId);
                loginUrl.searchParams.set('callbackUrl', callbackUrl);
                return NextResponse.redirect(loginUrl.toString());
            } else {
                // No account found - redirect to registration or error
                return NextResponse.redirect(new URL('/login?error=No%20account%20linked%20to%20this%20Discord', origin));
            }
        }
    } catch (error) {
        console.error('Error handling Discord callback:', error);
        return NextResponse.redirect(new URL('/login?error=Discord%20authentication%20failed', origin));
    }
}
