import { NextResponse } from 'next/server';
import { db } from '@/db';
import { siteSettings } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

/**
 * GET /api/settings/discord-oauth
 * Public endpoint to check Discord OAuth settings (whether login is available)
 */
export async function GET() {
    try {
        const settings = await db
            .select()
            .from(siteSettings)
            .where(inArray(siteSettings.key, [
                'discord_oauth_enabled',
                'discord_oauth_registration_enabled',
            ]));

        const settingsMap = Object.fromEntries(
            settings.map(s => [s.key, s.value])
        );

        return NextResponse.json({
            oauthEnabled: settingsMap['discord_oauth_enabled'] === 'true',
            registrationEnabled: settingsMap['discord_oauth_registration_enabled'] === 'true',
        });
    } catch (error) {
        console.error('Error checking Discord OAuth settings:', error);
        return NextResponse.json({
            oauthEnabled: false,
            registrationEnabled: false,
        });
    }
}
