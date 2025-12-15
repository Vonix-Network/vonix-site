import { NextResponse } from 'next/server';
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
                'discord_client_id',
                'discord_oauth_enabled',
            ]));

        const settingsMap = Object.fromEntries(
            settings.map(s => [s.key, s.value])
        );

        const clientId = settingsMap['discord_client_id'];
        const oauthEnabled = settingsMap['discord_oauth_enabled'] === 'true';

        if (!oauthEnabled) {
            return NextResponse.redirect(new URL('/login?error=Discord%20OAuth%20is%20disabled', request.url));
        }

        if (!clientId) {
            return NextResponse.redirect(new URL('/login?error=Discord%20not%20configured', request.url));
        }

        // Build the Discord authorization URL
        const redirectUri = new URL('/api/auth/discord/callback', request.url).toString();
        const state = Buffer.from(JSON.stringify({ callbackUrl })).toString('base64');

        const discordAuthUrl = new URL('https://discord.com/api/oauth2/authorize');
        discordAuthUrl.searchParams.set('client_id', clientId);
        discordAuthUrl.searchParams.set('redirect_uri', redirectUri);
        discordAuthUrl.searchParams.set('response_type', 'code');
        discordAuthUrl.searchParams.set('scope', 'identify guilds guilds.members.read');
        discordAuthUrl.searchParams.set('state', state);

        return NextResponse.redirect(discordAuthUrl.toString());
    } catch (error) {
        console.error('Error initiating Discord OAuth:', error);
        return NextResponse.redirect(new URL('/login?error=Failed%20to%20initiate%20Discord%20login', request.url));
    }
}
