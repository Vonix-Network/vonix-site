import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { servers, serverUptimeRecords, siteSettings } from '@/db/schema';
import { sql, lt, eq, inArray } from 'drizzle-orm';
import { pingServerNative } from '@/lib/minecraft-ping';

// Track consecutive offline counts per server (in-memory, resets on restart)
// Key: serverId, Value: consecutive offline count
const consecutiveOfflineCounts: Map<number, number> = new Map();

// Track which servers have already triggered a notification (to avoid spam)
const notifiedServers: Set<number> = new Set();

// Threshold for sending notifications
const OFFLINE_THRESHOLD = 3;

interface PingResult {
    serverId: number;
    serverName: string;
    online: boolean;
    playersOnline: number;
    playersMax: number;
    responseTimeMs: number | null;
    method: 'native' | 'api' | 'none';
    attempts: number;
}

/**
 * Send DM notifications to users with the manager role about server downtime
 */
async function sendDowntimeNotifications(
    serverName: string,
    serverId: number,
    botToken: string,
    guildId: string,
    roleId: string
): Promise<void> {
    try {
        console.log(`🔔 Sending downtime DM notifications for server: ${serverName}`);

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
                                description: `**${serverName}** has been detected as offline 3 times in a row.`,
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
 * Try native ping with retry
 */
async function tryNativePing(host: string, port: number, retries: number = 2): Promise<{
    success: boolean;
    online: boolean;
    playersOnline: number;
    playersMax: number;
    responseTimeMs: number | null;
}> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const startTime = Date.now();
            const result = await pingServerNative(host, port);
            const responseTime = Date.now() - startTime;

            if (result.success && result.data && result.data.online) {
                return {
                    success: true,
                    online: true,
                    playersOnline: result.data.players?.online || 0,
                    playersMax: result.data.players?.max || 0,
                    responseTimeMs: responseTime,
                };
            }

            // If we got a response but server is offline, that's still valid
            if (result.success && result.data) {
                return {
                    success: true,
                    online: result.data.online || false,
                    playersOnline: result.data.players?.online || 0,
                    playersMax: result.data.players?.max || 0,
                    responseTimeMs: responseTime,
                };
            }

            // Wait a bit before retry
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error: any) {
            console.log(`   Native ping attempt ${attempt}/${retries} failed:`, error);
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    return {
        success: false,
        online: false,
        playersOnline: 0,
        playersMax: 0,
        responseTimeMs: null,
    };
}

/**
 * Try mcstatus.io API with retry
 */
async function tryApiPing(host: string, port: number, retries: number = 2): Promise<{
    success: boolean;
    online: boolean;
    playersOnline: number;
    playersMax: number;
    responseTimeMs: number | null;
}> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const startTime = Date.now();
            const response = await fetch(
                `https://api.mcstatus.io/v2/status/java/${host}:${port}`,
                {
                    signal: AbortSignal.timeout(10000),
                    cache: 'no-store',
                }
            );
            const responseTime = Date.now() - startTime;

            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    online: data.online || false,
                    playersOnline: data.players?.online || 0,
                    playersMax: data.players?.max || 0,
                    responseTimeMs: responseTime,
                };
            }

            // Wait before retry
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error: any) {
            console.log(`   API ping attempt ${attempt}/${retries} failed:`, error);
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    return {
        success: false,
        online: false,
        playersOnline: 0,
        playersMax: 0,
        responseTimeMs: null,
    };
}

/**
 * Ping a server using multiple methods with retries
 * Order: Native ping (2 attempts) -> mcstatus.io API (2 attempts)
 * Only marks offline if ALL attempts fail
 */
async function pingServerWithRetry(
    server: { id: number; name: string; ipAddress: string; port: number }
): Promise<PingResult> {
    const host = server.ipAddress;
    const port = server.port;

    console.log(`   🔍 Checking ${server.name} (${host}:${port})...`);

    // Method 1: Try native ping first (preferred - more accurate and faster)
    console.log(`      Trying native ping...`);
    const nativeResult = await tryNativePing(host, port, 2);

    if (nativeResult.success && nativeResult.online) {
        console.log(`      ✓ Native ping: ONLINE (${nativeResult.playersOnline} players)`);
        return {
            serverId: server.id,
            serverName: server.name,
            online: true,
            playersOnline: nativeResult.playersOnline,
            playersMax: nativeResult.playersMax,
            responseTimeMs: nativeResult.responseTimeMs,
            method: 'native',
            attempts: 1,
        };
    }

    // Method 2: Try mcstatus.io API as fallback
    console.log(`      Native ping failed, trying mcstatus.io API...`);
    const apiResult = await tryApiPing(host, port, 2);

    if (apiResult.success && apiResult.online) {
        console.log(`      ✓ API ping: ONLINE (${apiResult.playersOnline} players)`);
        return {
            serverId: server.id,
            serverName: server.name,
            online: true,
            playersOnline: apiResult.playersOnline,
            playersMax: apiResult.playersMax,
            responseTimeMs: apiResult.responseTimeMs,
            method: 'api',
            attempts: 2,
        };
    }

    // If API returned a valid response but server is offline, trust it
    if (apiResult.success) {
        console.log(`      ✓ API ping: OFFLINE (server responded but is offline)`);
        return {
            serverId: server.id,
            serverName: server.name,
            online: false,
            playersOnline: 0,
            playersMax: apiResult.playersMax,
            responseTimeMs: apiResult.responseTimeMs,
            method: 'api',
            attempts: 2,
        };
    }

    // All methods failed - mark as offline
    console.log(`      ✗ All ping methods failed - marking as OFFLINE`);
    return {
        serverId: server.id,
        serverName: server.name,
        online: false,
        playersOnline: 0,
        playersMax: 0,
        responseTimeMs: null,
        method: 'none',
        attempts: 4, // 2 native + 2 API
    };
}

/**
 * GET /api/cron/uptime
 * Ping all servers and record uptime data
 * Should be called every 60 seconds by a cron job
 * 
 * Uses dual-method approach with retries for accuracy:
 * 1. Native direct ping (2 attempts)
 * 2. mcstatus.io API fallback (2 attempts)
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

        // Get all servers
        const allServers = await db.select().from(servers);

        if (allServers.length === 0) {
            console.log('📡 Uptime check: No servers configured');
            return NextResponse.json({ message: 'No servers to check', checked: 0 });
        }

        const timestamp = new Date().toLocaleTimeString();
        console.log(`\n📡 [${timestamp}] Running uptime check for ${allServers.length} server(s)...`);

        // Ping each server with retry logic
        const results = await Promise.all(
            allServers.map((server: any) => pingServerWithRetry({
                id: server.id,
                name: server.name,
                ipAddress: server.ipAddress,
                port: server.port,
            }))
        );

        // Store results in database
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

        // Clean up old records (older than 90 days)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        await db
            .delete(serverUptimeRecords)
            .where(lt(serverUptimeRecords.checkedAt, ninetyDaysAgo));

        // Update server status in servers table
        for (const result of results) {
            await db
                .update(servers)
                .set({
                    status: result.online ? 'online' : 'offline',
                    playersOnline: result.playersOnline,
                    playersMax: result.playersMax,
                    updatedAt: new Date(),
                })
                .where(sql`${servers.id} = ${result.serverId}`);
        }

        // Track consecutive offline counts and send notifications
        const serversToNotify: { id: number; name: string }[] = [];

        for (const result of results) {
            if (!result.online) {
                // Increment consecutive offline count
                const currentCount = consecutiveOfflineCounts.get(result.serverId) || 0;
                const newCount = currentCount + 1;
                consecutiveOfflineCounts.set(result.serverId, newCount);

                console.log(`   ⚠️ ${result.serverName}: offline ${newCount}/${OFFLINE_THRESHOLD} times`);

                // Check if we've hit the threshold and haven't already notified
                if (newCount >= OFFLINE_THRESHOLD && !notifiedServers.has(result.serverId)) {
                    serversToNotify.push({ id: result.serverId, name: result.serverName });
                }
            } else {
                // Server is back online - reset counters
                if (consecutiveOfflineCounts.has(result.serverId)) {
                    console.log(`   ✅ ${result.serverName}: back online, resetting counter`);
                }
                consecutiveOfflineCounts.delete(result.serverId);
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
        const nativeCount = results.filter((r: any) => r.method === 'native').length;
        const apiCount = results.filter((r: any) => r.method === 'api').length;

        console.log(`✅ Uptime check complete: ${onlineCount} online, ${offlineCount} offline`);
        console.log(`   Methods used: ${nativeCount} native, ${apiCount} API fallback`);

        return NextResponse.json({
            success: true,
            message: `Checked ${results.length} servers`,
            checked: results.length,
            online: onlineCount,
            offline: offlineCount,
            methods: {
                native: nativeCount,
                api: apiCount,
                failed: results.filter((r: any) => r.method === 'none').length,
            },
            results: results.map((r: any) => ({
                server: r.serverName,
                online: r.online,
                players: r.playersOnline,
                method: r.method,
            })),
        });
    } catch (error: any) {
        console.error('Error in uptime cron:', error);
        return NextResponse.json({ error: 'Failed to check servers' }, { status: 500 });
    }
}

