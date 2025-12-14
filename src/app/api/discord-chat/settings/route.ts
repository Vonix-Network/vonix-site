import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { siteSettings } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

const ALL_DISCORD_SETTINGS = [
    'discord_chat_enabled',
    'discord_chat_channel_name',
    'discord_chat_webhook',
    'discord_bot_token',
    'discord_chat_channel_id',
    // Discord integration settings (for slash commands, role management)
    'discord_client_id',
    'discord_guild_id',
    // Discord OAuth settings
    'discord_oauth_client_id',
    'discord_oauth_client_secret',
    'discord_oauth_redirect_uri',
    'discord_oauth_enabled',
    // Ticket system settings
    'discord_ticket_forum_id',
    'discord_ticket_category_id',
    'discord_ticket_staff_role_id',
    'discord_ticket_ping_role_id',
    // Second channel for Minecraft server embeds (Viscord)
    'discord_viscord_channel_id',
    'discord_viscord_channel_name',
    // Donation events webhook
    'discord_donation_webhook_url',
    'discord_donation_webhook_avatar_url',
];

// Public settings that can be returned to any user
const PUBLIC_SETTINGS = [
    'discord_chat_enabled',
    'discord_chat_channel_name',
];

/**
 * GET /api/discord-chat/settings
 * Get Discord chat settings
 * - For admins: returns all settings including sensitive ones
 * - For public: returns only non-sensitive settings
 */
export async function GET(request: NextRequest) {
    try {
        // Check if user is admin
        const session = await auth();
        const isAdmin = session?.user?.role && ['admin', 'superadmin'].includes(session.user.role);

        // Fetch all or just public settings based on role
        const keysToFetch = isAdmin ? ALL_DISCORD_SETTINGS : PUBLIC_SETTINGS;

        const settings = await db
            .select()
            .from(siteSettings)
            .where(inArray(siteSettings.key, keysToFetch));

        const settingsMap = Object.fromEntries(
            settings.map(s => [s.key, s.value])
        );

        if (isAdmin) {
            // Return all settings for admin
            return NextResponse.json({
                enabled: settingsMap['discord_chat_enabled'] === 'true',
                channelName: settingsMap['discord_chat_channel_name'] || '',
                webhookUrl: settingsMap['discord_chat_webhook'] || '',
                botToken: settingsMap['discord_bot_token'] || '',
                channelId: settingsMap['discord_chat_channel_id'] || '',
                // Discord integration (slash commands, role management)
                clientId: settingsMap['discord_client_id'] || '',
                guildId: settingsMap['discord_guild_id'] || '',
                // OAuth settings
                oauthClientId: settingsMap['discord_oauth_client_id'] || '',
                oauthClientSecret: settingsMap['discord_oauth_client_secret'] || '',
                oauthRedirectUri: settingsMap['discord_oauth_redirect_uri'] || '',
                oauthEnabled: settingsMap['discord_oauth_enabled'] === 'true',
                // Ticket system settings
                ticketForumId: settingsMap['discord_ticket_forum_id'] || '',
                ticketCategoryId: settingsMap['discord_ticket_category_id'] || '',
                ticketStaffRoleId: settingsMap['discord_ticket_staff_role_id'] || '',
                ticketPingRoleId: settingsMap['discord_ticket_ping_role_id'] || '',
                // Viscord (Minecraft server embeds) channel
                viscordChannelId: settingsMap['discord_viscord_channel_id'] || '',
                viscordChannelName: settingsMap['discord_viscord_channel_name'] || '',
                // Donation webhook
                donationWebhookUrl: settingsMap['discord_donation_webhook_url'] || '',
                donationWebhookAvatarUrl: settingsMap['discord_donation_webhook_avatar_url'] || '',
            });
        }

        // Public response
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

        // Discord integration settings (for slash commands)
        if (typeof body.clientId === 'string') {
            updates.push({
                key: 'discord_client_id',
                value: body.clientId,
                description: 'Discord Application/Client ID for slash commands',
            });
        }

        if (typeof body.guildId === 'string') {
            updates.push({
                key: 'discord_guild_id',
                value: body.guildId,
                description: 'Discord Server/Guild ID for slash commands',
            });
        }

        // Viscord (second channel) settings
        if (typeof body.viscordChannelId === 'string') {
            updates.push({
                key: 'discord_viscord_channel_id',
                value: body.viscordChannelId,
                description: 'Discord channel ID for Minecraft server embeds (Viscord)',
            });
        }

        if (typeof body.viscordChannelName === 'string') {
            updates.push({
                key: 'discord_viscord_channel_name',
                value: body.viscordChannelName,
                description: 'Discord channel name for Minecraft server embeds display',
            });
        }

        // Donation webhook settings
        if (typeof body.donationWebhookUrl === 'string') {
            updates.push({
                key: 'discord_donation_webhook_url',
                value: body.donationWebhookUrl,
                description: 'Discord webhook URL for donation announcements',
            });
        }

        if (typeof body.donationWebhookAvatarUrl === 'string') {
            updates.push({
                key: 'discord_donation_webhook_avatar_url',
                value: body.donationWebhookAvatarUrl,
                description: 'Custom avatar URL for donation webhook',
            });
        }

        // OAuth settings
        if (typeof body.oauthClientId === 'string') {
            updates.push({
                key: 'discord_oauth_client_id',
                value: body.oauthClientId,
                description: 'Discord OAuth Client ID',
            });
        }

        if (typeof body.oauthClientSecret === 'string') {
            updates.push({
                key: 'discord_oauth_client_secret',
                value: body.oauthClientSecret,
                description: 'Discord OAuth Client Secret',
            });
        }

        if (typeof body.oauthRedirectUri === 'string') {
            updates.push({
                key: 'discord_oauth_redirect_uri',
                value: body.oauthRedirectUri,
                description: 'Discord OAuth Redirect URI',
            });
        }

        if (typeof body.oauthEnabled === 'boolean') {
            updates.push({
                key: 'discord_oauth_enabled',
                value: body.oauthEnabled.toString(),
                description: 'Whether Discord OAuth login is enabled',
            });
        }

        // Ticket system settings
        if (typeof body.ticketForumId === 'string') {
            updates.push({
                key: 'discord_ticket_forum_id',
                value: body.ticketForumId,
                description: 'Discord forum channel ID for ticket threads',
            });
        }

        if (typeof body.ticketCategoryId === 'string') {
            updates.push({
                key: 'discord_ticket_category_id',
                value: body.ticketCategoryId,
                description: 'Discord category ID for ticket channels',
            });
        }

        if (typeof body.ticketStaffRoleId === 'string') {
            updates.push({
                key: 'discord_ticket_staff_role_id',
                value: body.ticketStaffRoleId,
                description: 'Discord role ID for ticket staff',
            });
        }

        if (typeof body.ticketPingRoleId === 'string') {
            updates.push({
                key: 'discord_ticket_ping_role_id',
                value: body.ticketPingRoleId,
                description: 'Discord role ID to ping on new tickets',
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
                    isPublic: update.key === 'discord_chat_enabled' ||
                        update.key === 'discord_chat_channel_name' ||
                        update.key === 'discord_viscord_channel_name',
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
