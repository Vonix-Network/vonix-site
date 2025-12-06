import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { servers, serverUptimeRecords } from '@/db/schema';
import { sql, lt } from 'drizzle-orm';

// Secret key for cron job authentication (use env variable in production)
const CRON_SECRET = process.env.CRON_SECRET || 'vonix-cron-secret';

/**
 * GET /api/cron/uptime
 * Ping all servers and record uptime data
 * Should be called every 60 seconds by a cron job
 * 
 * Authentication methods (any one of these):
 * - Header: Authorization: Bearer <CRON_SECRET>
 * - Header: x-cron-secret: <CRON_SECRET>
 * - Query param: ?secret=<CRON_SECRET>
 * - Vercel Cron: x-vercel-cron header (automatic)
 */
export async function GET(request: NextRequest) {
    try {
        // Verify cron secret - multiple methods for flexibility
        const authHeader = request.headers.get('authorization');
        const cronSecretHeader = request.headers.get('x-cron-secret');
        const vercelCronHeader = request.headers.get('x-vercel-cron');
        const secretParam = request.nextUrl.searchParams.get('secret');

        const isAuthorized =
            authHeader === `Bearer ${CRON_SECRET}` ||
            cronSecretHeader === CRON_SECRET ||
            secretParam === CRON_SECRET ||
            vercelCronHeader !== null; // Vercel cron sets this automatically

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all servers
        const allServers = await db.select().from(servers);

        if (allServers.length === 0) {
            return NextResponse.json({ message: 'No servers to check', checked: 0 });
        }

        // Ping each server
        const results = await Promise.all(
            allServers.map(async (server) => {
                const startTime = Date.now();

                try {
                    // Use mcstatus.io API to check server status
                    const response = await fetch(
                        `https://api.mcstatus.io/v2/status/java/${server.ipAddress}:${server.port}`,
                        {
                            signal: AbortSignal.timeout(10000),
                            cache: 'no-store',
                        }
                    );

                    const responseTime = Date.now() - startTime;

                    if (response.ok) {
                        const data = await response.json();

                        return {
                            serverId: server.id,
                            online: data.online || false,
                            playersOnline: data.players?.online || 0,
                            playersMax: data.players?.max || 0,
                            responseTimeMs: responseTime,
                        };
                    }

                    return {
                        serverId: server.id,
                        online: false,
                        playersOnline: 0,
                        playersMax: 0,
                        responseTimeMs: null,
                    };
                } catch (error) {
                    return {
                        serverId: server.id,
                        online: false,
                        playersOnline: 0,
                        playersMax: 0,
                        responseTimeMs: null,
                    };
                }
            })
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
                    status: result.online ? 'online' : 'offline',
                    playersOnline: result.playersOnline,
                    playersMax: result.playersMax,
                    updatedAt: new Date(),
                })
                .where(sql`${servers.id} = ${result.serverId}`);
        }

        return NextResponse.json({
            success: true,
            message: `Checked ${results.length} servers`,
            checked: results.length,
            online: results.filter(r => r.online).length,
            offline: results.filter(r => !r.online).length,
        });
    } catch (error) {
        console.error('Error in uptime cron:', error);
        return NextResponse.json({ error: 'Failed to check servers' }, { status: 500 });
    }
}
