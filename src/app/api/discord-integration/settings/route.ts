import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { siteSettings } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

/**
 * GET /api/discord-integration/settings
 * Get Discord integration settings (admin only)
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.role || !['admin', 'superadmin'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const settings = await db
            .select()
            .from(siteSettings)
            .where(
                inArray(siteSettings.key, [
                    'discord_client_id',
                    'discord_client_secret',
                    'discord_guild_id',
                    'discord_ticket_forum_id',
                ])
            );

        const settingsMap = new Map(settings.map((s: any) => [s.key, s.value]));

        return NextResponse.json({
            clientId: settingsMap.get('discord_client_id') || '',
            clientSecret: settingsMap.get('discord_client_secret') || '',
            guildId: settingsMap.get('discord_guild_id') || '',
            ticketForumId: settingsMap.get('discord_ticket_forum_id') || '',
        });
    } catch (error: any) {
        console.error('Error fetching Discord integration settings:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

/**
 * PATCH /api/discord-integration/settings
 * Update Discord integration settings (admin only)
 */
export async function PATCH(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.role || !['admin', 'superadmin'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const updates: { key: string; value: string; description: string }[] = [];

        if (typeof body.clientId !== 'undefined') {
            updates.push({
                key: 'discord_client_id',
                value: body.clientId,
                description: 'Discord OAuth Client ID',
            });
        }

        if (typeof body.clientSecret !== 'undefined') {
            updates.push({
                key: 'discord_client_secret',
                value: body.clientSecret,
                description: 'Discord OAuth Client Secret',
            });
        }

        if (typeof body.guildId !== 'undefined') {
            updates.push({
                key: 'discord_guild_id',
                value: body.guildId,
                description: 'Discord Server (Guild) ID',
            });
        }

        if (typeof body.ticketForumId !== 'undefined') {
            updates.push({
                key: 'discord_ticket_forum_id',
                value: body.ticketForumId,
                description: 'Discord Ticket Forum Channel ID',
            });
        }

        // Update or insert settings
        for (const update of updates) {
            await db
                .insert(siteSettings)
                .values({
                    key: update.key,
                    value: update.value,
                    category: 'discord',
                    description: update.description,
                    isPublic: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
                .onConflictDoUpdate({
                    target: siteSettings.key,
                    set: {
                        value: update.value,
                        updatedAt: new Date(),
                    },
                });
        }

        // Re-register slash commands if guild ID changed
        if (body.guildId) {
            try {
                const { registerSlashCommands } = await import('@/lib/discord-integration');
                await registerSlashCommands();
                console.log('✅ Re-registered Discord slash commands');
            } catch (error: any) {
                console.error('Failed to re-register slash commands:', error);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error updating Discord integration settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
