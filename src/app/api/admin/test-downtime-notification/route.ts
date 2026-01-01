import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { siteSettings } from '@/db/schema';
import { inArray } from 'drizzle-orm';

/**
 * POST /api/admin/test-downtime-notification
 * Send a test DM to all managers with the configured role
 */
export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const session = await auth();
        if (!session?.user?.role || !['admin', 'superadmin'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Fetch Discord settings
        const discordSettings = await db
            .select()
            .from(siteSettings)
            .where(inArray(siteSettings.key, [
                'discord_bot_token',
                'discord_guild_id',
                'discord_downtime_manager_role_id'
            ]));

        const settingsMap = Object.fromEntries(
            discordSettings.map((s: any) => [s.key, s.value])
        );

        const botToken = settingsMap['discord_bot_token'];
        const guildId = settingsMap['discord_guild_id'];
        const roleId = settingsMap['discord_downtime_manager_role_id'];

        // Validate settings
        if (!botToken) {
            return NextResponse.json({
                success: false,
                error: 'Discord Bot Token is not configured'
            }, { status: 400 });
        }

        if (!guildId) {
            return NextResponse.json({
                success: false,
                error: 'Discord Guild ID is not configured'
            }, { status: 400 });
        }

        if (!roleId) {
            return NextResponse.json({
                success: false,
                error: 'Downtime Manager Role ID is not configured'
            }, { status: 400 });
        }

        console.log('🔔 Sending TEST downtime DM notifications');

        // Fetch guild members with the specified role using Discord API
        const membersResponse = await fetch(
            `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`,
            {
                headers: {
                    'Authorization': `Bot ${botToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!membersResponse.ok) {
            const errorText = await membersResponse.text();
            console.error(`Failed to fetch guild members: ${membersResponse.status}`, errorText);
            return NextResponse.json({
                success: false,
                error: `Failed to fetch guild members: ${membersResponse.status}. Check your Bot Token and Guild ID.`
            }, { status: 400 });
        }

        const members = await membersResponse.json();

        // Filter members who have the manager role
        const managersToNotify = members.filter((member: any) =>
            member.roles && member.roles.includes(roleId)
        );

        if (managersToNotify.length === 0) {
            return NextResponse.json({
                success: false,
                error: `No members found with role ID ${roleId}. Make sure the role ID is correct.`
            }, { status: 400 });
        }

        console.log(`Found ${managersToNotify.length} managers to notify`);

        const results: { username: string; success: boolean; error?: string }[] = [];

        // Send DM to each manager
        for (const manager of managersToNotify) {
            try {
                // Create DM channel
                const dmChannelResponse = await fetch(
                    'https://discord.com/api/v10/users/@me/channels',
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bot ${botToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            recipient_id: manager.user.id,
                        }),
                    }
                );

                if (!dmChannelResponse.ok) {
                    results.push({
                        username: manager.user.username,
                        success: false,
                        error: 'Could not create DM channel (user may have DMs disabled)'
                    });
                    continue;
                }

                const dmChannel = await dmChannelResponse.json();

                // Send the test message
                const messageResponse = await fetch(
                    `https://discord.com/api/v10/channels/${dmChannel.id}/messages`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bot ${botToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            embeds: [{
                                title: '🧪 Test Notification',
                                description: 'This is a **test** of the Vonix Network server downtime notification system.',
                                color: 0x00FF00, // Green
                                fields: [
                                    {
                                        name: '✅ Configuration Verified',
                                        value: 'Your Discord settings are correctly configured! You will receive alerts when servers go down.',
                                        inline: false,
                                    },
                                    {
                                        name: '📋 How It Works',
                                        value: 'When a server is detected as offline 3 times in a row, you will receive a red alert DM.',
                                        inline: false,
                                    },
                                    {
                                        name: '⏰ Test Sent At',
                                        value: new Date().toLocaleString(),
                                        inline: true,
                                    },
                                ],
                                footer: {
                                    text: 'Vonix Network Server Monitor - Test Mode',
                                },
                                timestamp: new Date().toISOString(),
                            }],
                        }),
                    }
                );

                if (messageResponse.ok) {
                    console.log(`✅ Sent test DM to ${manager.user.username}`);
                    results.push({ username: manager.user.username, success: true });
                } else {
                    const errorText = await messageResponse.text();
                    console.warn(`Failed to send DM to ${manager.user.username}: ${messageResponse.status}`, errorText);
                    results.push({
                        username: manager.user.username,
                        success: false,
                        error: `Failed to send message: ${messageResponse.status}`
                    });
                }

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (dmError: any) {
                console.error(`Error sending DM to manager ${manager.user?.username}:`, dmError);
                results.push({
                    username: manager.user?.username || 'Unknown',
                    success: false,
                    error: dmError.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        console.log(`✅ Test notifications complete: ${successCount} sent, ${failCount} failed`);

        return NextResponse.json({
            success: true,
            message: `Test notifications sent to ${successCount} manager(s)`,
            totalManagers: managersToNotify.length,
            sent: successCount,
            failed: failCount,
            results,
        });

    } catch (error: any) {
        console.error('Error sending test notifications:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to send test notifications'
        }, { status: 500 });
    }
}
