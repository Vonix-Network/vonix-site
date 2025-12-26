import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/db';
import { siteSettings } from '@/db/schema';
import { inArray } from 'drizzle-orm';

/**
 * GET /api/auth/discord
 * Initiates Discord OAuth flow using credentials from database
 * Redirects to Discord's authorization URL
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const callbackUrl = searchParams.get('callbackUrl') || '/settings';

        // Fetch Discord credentials from database
        const settings = await db
            .select()
            .from(siteSettings)
            .where(inArray(siteSettings.key, [
                'discord_oauth_client_id',
                'discord_oauth_enabled',
            ]));

        const settingsMap = Object.fromEntries(
            settings.map((s: any) => [s.key, s.value])
        );

        const clientId = settingsMap['discord_oauth_client_id'];
        const oauthEnabled = settingsMap['discord_oauth_enabled'] === 'true';

        if (!oauthEnabled) {
            return NextResponse.redirect(new URL('/login?error=Discord%20OAuth%20is%20disabled', request.url));
        }

        if (!clientId) {
            return NextResponse.redirect(new URL('/login?error=Discord%20not%20configured', request.url));
        }

        // Get proper origin from headers (handles reverse proxy)
        const headersList = await headers();
        const host = headersList.get('x-forwarded-host') || headersList.get('host') || '';
        // Force HTTPS for production - Discord requires exact redirect_uri match
        // The x-forwarded-proto header may return 'http' depending on proxy config
        const proto = host.includes('localhost') ? 'http' : 'https';
        const origin = `${proto}://${host}`;

        // Build redirect URI with fixed path
        const redirectUri = `${origin}/api/auth/discord/callback`;
        const state = Buffer.from(JSON.stringify({ callbackUrl })).toString('base64');

        const discordAuthUrl = new URL('https://discord.com/api/oauth2/authorize');
        discordAuthUrl.searchParams.set('client_id', clientId);
        discordAuthUrl.searchParams.set('redirect_uri', redirectUri);
        discordAuthUrl.searchParams.set('response_type', 'code');
        discordAuthUrl.searchParams.set('scope', 'identify guilds guilds.members.read');
        discordAuthUrl.searchParams.set('state', state);

        // Debug mode - return JSON instead of redirecting
        if (searchParams.get('debug') === '1') {
            return NextResponse.json({
                redirectUri,
                origin,
                host,
                proto,
                discordAuthUrl: discordAuthUrl.toString(),
            });
        }

        return NextResponse.redirect(discordAuthUrl.toString());
    } catch (error: any) {
        console.error('Error initiating Discord OAuth:', error);
        return NextResponse.redirect(new URL('/login?error=Failed%20to%20initiate%20Discord%20login', request.url));
    }
}
