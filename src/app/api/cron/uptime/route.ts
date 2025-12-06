import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { servers, serverUptimeRecords, siteSettings } from '@/db/schema';
import { sql, lt, eq } from 'drizzle-orm';
import { pingServerNative } from '@/lib/minecraft-ping';

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
        } catch (error) {
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
        } catch (error) {
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
    server: { id: number; name: string; address: string; port: number }
): Promise<PingResult> {
    const host = server.address;
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
            allServers.map(server => pingServerWithRetry({
                id: server.id,
                name: server.name,
                address: server.address,
                port: server.port,
            }))
        );

        // Store results in database
        await db.insert(serverUptimeRecords).values(
            results.map(result => ({
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
                    online: result.online,
                    playersOnline: result.playersOnline,
                    playersMax: result.playersMax,
                    updatedAt: new Date(),
                })
                .where(sql`${servers.id} = ${result.serverId}`);
        }

        const onlineCount = results.filter(r => r.online).length;
        const offlineCount = results.filter(r => !r.online).length;
        const nativeCount = results.filter(r => r.method === 'native').length;
        const apiCount = results.filter(r => r.method === 'api').length;

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
                failed: results.filter(r => r.method === 'none').length,
            },
            results: results.map(r => ({
                server: r.serverName,
                online: r.online,
                players: r.playersOnline,
                method: r.method,
            })),
        });
    } catch (error) {
        console.error('Error in uptime cron:', error);
        return NextResponse.json({ error: 'Failed to check servers' }, { status: 500 });
    }
}
