import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { servers, serverUptimeRecords, siteSettings } from '@/db/schema';
import { sql, lt, eq, inArray, ne } from 'drizzle-orm';
import { pingGameServer, GameType } from '@/lib/game-ping';

// Threshold for sending notifications - 5 consecutive failures
const OFFLINE_THRESHOLD = 5;

// Track which servers have already triggered a notification (to avoid spam during session)
const notifiedServers: Set<number> = new Set();

interface PingResult {
    serverId: number;
    serverName: string;
    online: boolean;
    playersOnline: number;
    playersMax: number;
    responseTimeMs: number | null;
    gameType: GameType;
    attempts: number;
    skipped?: boolean;
    skipReason?: string;
}

/**
 * Send DM notifications to users with the manager role about server downtime
 */
async function sendDowntimeNotifications(
    serverName: string,
    serverId: number,
    consecutiveFailures: number,
    botToken: string,
    guildId: string,
    roleId: string
): Promise<void> {
    try {
        console.log(`🔔 Sending downtime DM notifications for server: ${serverName} (${consecutiveFailures} consecutive failures)`);

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
            console.error(`Failed to fetch guild members: ${membersResponse.status}`);
            return;
        }

        const members = await membersResponse.json();

        // Filter members who have the manager role
        const managersToNotify = members.filter((member: any) =>
            member.roles && member.roles.includes(roleId)
        );

        console.log(`Found ${managersToNotify.length} managers to notify`);

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
                    console.warn(`Could not create DM channel for ${manager.user.username}`);
                    continue;
                }

                const dmChannel = await dmChannelResponse.json();

                // Send the alert message
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
                                title: '🚨 Server Downtime Alert',
                                description: `**${serverName}** has been detected as offline ${consecutiveFailures} times in a row.`,
                                color: 0xFF0000, // Red
                                fields: [
                                    {
                                        name: '🔧 Action Required',
                                        value: 'Please check the server status and investigate the issue.',
                                        inline: false,
                                    },
                                    {
                                        name: '⏰ Detected At',
                                        value: new Date().toLocaleString(),
                                        inline: true,
                                    },
                                    {
                                        name: '📊 Consecutive Failures',
                                        value: `${consecutiveFailures}`,
                                        inline: true,
                                    },
                                ],
                                footer: {
                                    text: 'Vonix Network Server Monitor',
                                },
                                timestamp: new Date().toISOString(),
                            }],
                        }),
                    }
                );

                if (messageResponse.ok) {
                    console.log(`✅ Sent downtime DM to ${manager.user.username}`);
                } else {
                    console.warn(`Failed to send DM to ${manager.user.username}: ${messageResponse.status}`);
                }

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (dmError) {
                console.error(`Error sending DM to manager ${manager.user?.username}:`, dmError);
            }
        }

        // Mark this server as notified to avoid spam
        notifiedServers.add(serverId);
        console.log(`✅ Downtime notifications sent for ${serverName}`);
    } catch (error) {
        console.error('Error sending downtime notifications:', error);
    }
}

/**
 * Ping a server using native protocol (no external API)
 */
async function pingServer(
    server: { id: number; name: string; ipAddress: string; port: number; gameType: string | null }
): Promise<PingResult> {
    const host = server.ipAddress;
    const port = server.port;
    const gameType = (server.gameType || 'minecraft') as GameType;

    console.log(`   🔍 Checking ${server.name} (${host}:${port}, ${gameType})...`);

    const startTime = Date.now();
    const result = await pingGameServer(host, port, gameType);
    const responseTime = Date.now() - startTime;

    if (result.success && result.data?.online) {
        console.log(`      ✓ ONLINE (${result.data.players?.online || 0} players, ${responseTime}ms)`);
        return {
            serverId: server.id,
            serverName: server.name,
            online: true,
            playersOnline: result.data.players?.online || 0,
            playersMax: result.data.players?.max || 0,
            responseTimeMs: responseTime,
            gameType,
            attempts: 3,
        };
    }

    console.log(`      ✗ OFFLINE (${result.error || 'ping failed'})`);
    return {
        serverId: server.id,
        serverName: server.name,
        online: false,
        playersOnline: 0,
        playersMax: result.data?.players?.max || 0,
        responseTimeMs: null,
        gameType,
        attempts: 3,
    };
}

/**
 * GET /api/cron/uptime
 * Ping all servers and record uptime data
 * Should be called every 60 seconds by a cron job
 * 
 * Features:
 * - Native protocol pinging (no external API dependency)
 * - Skips servers in maintenance mode
 * - 5 consecutive failures before notification
 * - Persistent failure tracking in database
 * 
 * Authentication methods (any one of these):
 * - Header: Authorization: Bearer <CRON_SECRET>
 * - Header: x-cron-secret: <CRON_SECRET>
 * - Query param: ?secret=<CRON_SECRET>
 * - Vercel Cron: x-vercel-cron header (automatic)
 */
export async function GET(request: NextRequest) {
    try {
        // Get cron secret from database first, fallback to env var
        const [dbSecret] = await db
            .select()
            .from(siteSettings)
            .where(eq(siteSettings.key, 'cron_secret'));

        const CRON_SECRET = dbSecret?.value || process.env.CRON_SECRET;

        // If no cron secret is configured anywhere, allow in development
        if (!CRON_SECRET) {
            console.warn('⚠️ No cron secret configured - allowing request (set one in Admin → API Keys)');
        } else {
            // Verify cron secret - multiple methods for flexibility
            const authHeader = request.headers.get('authorization');
            const cronSecretHeader = request.headers.get('x-cron-secret');
            const vercelCronHeader = request.headers.get('x-vercel-cron');
            const secretParam = request.nextUrl.searchParams.get('secret');

            const isAuthorized =
                authHeader === `Bearer ${CRON_SECRET}` ||
                cronSecretHeader === CRON_SECRET ||
                secretParam === CRON_SECRET ||
                vercelCronHeader !== null;

            if (!isAuthorized) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        // Get all servers (excluding those in maintenance mode)
        const allServers = await db.select().from(servers);
        const activeServers = allServers.filter((s: any) => !s.maintenanceMode);
        const maintenanceServers = allServers.filter((s: any) => s.maintenanceMode);

        if (allServers.length === 0) {
            console.log('📡 Uptime check: No servers configured');
            return NextResponse.json({ message: 'No servers to check', checked: 0 });
        }

        const timestamp = new Date().toLocaleTimeString();
        console.log(`\n📡 [${timestamp}] Running uptime check for ${activeServers.length} server(s) (${maintenanceServers.length} in maintenance)...`);

        // Log maintenance servers
        if (maintenanceServers.length > 0) {
            console.log(`   🔧 Maintenance mode (skipped): ${maintenanceServers.map((s: any) => s.name).join(', ')}`);
        }

        // Ping each active server with native protocol
        const results = await Promise.all(
            activeServers.map((server: any) => pingServer({
                id: server.id,
                name: server.name,
                ipAddress: server.ipAddress,
                port: server.port,
                gameType: server.gameType,
            }))
        );

        // Store results in database for active servers
        if (results.length > 0) {
            await db.insert(serverUptimeRecords).values(
                results.map((result: any) => ({
                    serverId: result.serverId,
                    online: result.online,
                    playersOnline: result.playersOnline,
                    playersMax: result.playersMax,
                    responseTimeMs: result.responseTimeMs,
                    checkedAt: new Date(),
                }))
            );
        }

        // Clean up old records (older than 90 days)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        await db
            .delete(serverUptimeRecords)
            .where(lt(serverUptimeRecords.checkedAt, ninetyDaysAgo));

        // Track consecutive failures and update server status
        const serversToNotify: { id: number; name: string; failures: number }[] = [];

        for (const result of results) {
            const server = activeServers.find((s: any) => s.id === result.serverId);
            if (!server) continue;

            if (!result.online) {
                // Increment consecutive failures in database
                const newFailureCount = (server.consecutiveFailures || 0) + 1;

                await db
                    .update(servers)
                    .set({
                        status: 'offline',
                        playersOnline: 0,
                        consecutiveFailures: newFailureCount,
                        updatedAt: new Date(),
                    })
                    .where(eq(servers.id, result.serverId));

                console.log(`   ⚠️ ${result.serverName}: offline ${newFailureCount}/${OFFLINE_THRESHOLD} times`);

                // Check if we've hit the threshold and haven't already notified
                if (newFailureCount >= OFFLINE_THRESHOLD && !notifiedServers.has(result.serverId)) {
                    serversToNotify.push({
                        id: result.serverId,
                        name: result.serverName,
                        failures: newFailureCount,
                    });
                }
            } else {
                // Server is back online - reset counters
                if (server.consecutiveFailures > 0) {
                    console.log(`   ✅ ${result.serverName}: back online, resetting counter`);
                }

                await db
                    .update(servers)
                    .set({
                        status: 'online',
                        playersOnline: result.playersOnline,
                        playersMax: result.playersMax,
                        consecutiveFailures: 0,
                        updatedAt: new Date(),
                    })
                    .where(eq(servers.id, result.serverId));

                notifiedServers.delete(result.serverId); // Allow future notifications
            }
        }

        // Send notifications if any servers hit the threshold
        if (serversToNotify.length > 0) {
            // Fetch Discord settings for notifications
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

            if (botToken && guildId && roleId) {
                for (const server of serversToNotify) {
                    await sendDowntimeNotifications(
                        server.name,
                        server.id,
                        server.failures,
                        botToken,
                        guildId,
                        roleId
                    );
                }
            } else {
                console.warn('⚠️ Downtime notifications skipped - Discord settings not configured');
                console.warn(`   Bot Token: ${botToken ? '✓' : '✗'}, Guild ID: ${guildId ? '✓' : '✗'}, Role ID: ${roleId ? '✓' : '✗'}`);
            }
        }

        const onlineCount = results.filter((r: any) => r.online).length;
        const offlineCount = results.filter((r: any) => !r.online).length;

        console.log(`✅ Uptime check complete: ${onlineCount} online, ${offlineCount} offline, ${maintenanceServers.length} skipped (maintenance)`);

        return NextResponse.json({
            success: true,
            message: `Checked ${results.length} servers`,
            checked: results.length,
            online: onlineCount,
            offline: offlineCount,
            maintenance: maintenanceServers.length,
            offlineThreshold: OFFLINE_THRESHOLD,
            results: results.map((r: any) => ({
                server: r.serverName,
                online: r.online,
                players: r.playersOnline,
                gameType: r.gameType,
            })),
        });
    } catch (error: any) {
        console.error('Error in uptime cron:', error);
        return NextResponse.json({ error: 'Failed to check servers' }, { status: 500 });
    }
}
