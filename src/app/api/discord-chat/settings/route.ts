import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { siteSettings } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

/**
 * GET /api/discord-chat/settings
 * Get public Discord chat settings (for the frontend)
 */
export async function GET() {
    try {
        const settings = await db
            .select()
            .from(siteSettings)
            .where(inArray(siteSettings.key, [
                'discord_chat_enabled',
                'discord_chat_channel_name',
            ]));

        const settingsMap = Object.fromEntries(
            settings.map(s => [s.key, s.value])
        );

        return NextResponse.json({
            enabled: settingsMap['discord_chat_enabled'] === 'true',
            channelName: settingsMap['discord_chat_channel_name'] || undefined,
        });
    } catch (error) {
        console.error('Error fetching discord chat settings:', error);
        return NextResponse.json({ enabled: false }, { status: 500 });
    }
}

/**
 * PATCH /api/discord-chat/settings
 * Update Discord chat settings (admin only)
 */
export async function PATCH(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.role || !['admin', 'superadmin'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const updates: { key: string; value: string; description: string }[] = [];

        if (typeof body.enabled === 'boolean') {
            updates.push({
                key: 'discord_chat_enabled',
                value: body.enabled.toString(),
                description: 'Whether Discord chat integration is enabled',
            });
        }

        if (typeof body.webhookUrl === 'string') {
            updates.push({
                key: 'discord_chat_webhook',
                value: body.webhookUrl,
                description: 'Discord webhook URL for sending messages from website',
            });
        }

        if (typeof body.botToken === 'string') {
            updates.push({
                key: 'discord_bot_token',
                value: body.botToken,
                description: 'Discord bot token (for receiving messages)',
            });
        }

        if (typeof body.channelId === 'string') {
            updates.push({
                key: 'discord_chat_channel_id',
                value: body.channelId,
                description: 'Discord channel ID for the chat bridge',
            });
        }

        if (typeof body.channelName === 'string') {
            updates.push({
                key: 'discord_chat_channel_name',
                value: body.channelName,
                description: 'Discord channel name for display',
            });
        }

        // Upsert each setting
        for (const update of updates) {
            const [existing] = await db
                .select()
                .from(siteSettings)
                .where(eq(siteSettings.key, update.key));

            if (existing) {
                await db
                    .update(siteSettings)
                    .set({
                        value: update.value,
                        updatedAt: new Date(),
                    })
                    .where(eq(siteSettings.key, update.key));
            } else {
                await db.insert(siteSettings).values({
                    key: update.key,
                    value: update.value,
                    category: 'discord',
                    description: update.description,
                    isPublic: update.key === 'discord_chat_enabled' || update.key === 'discord_chat_channel_name',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating discord chat settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
