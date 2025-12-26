import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { serverUptimeRecords, servers } from '@/db/schema';
import { eq, desc, gte, and, sql } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/servers/[id]/uptime
 * Get uptime history for a specific server
 * 
 * For longer time ranges, data is aggregated by hour to reduce response size
 * while still providing accurate statistics.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const serverId = parseInt(id);

        if (isNaN(serverId)) {
            return NextResponse.json({ error: 'Invalid server ID' }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const days = Math.min(parseInt(searchParams.get('days') || '7'), 90);

        // Verify server exists
        const [server] = await db.select().from(servers).where(eq(servers.id, serverId));
        if (!server) {
            return NextResponse.json({ error: 'Server not found' }, { status: 404 });
        }

        // Calculate date range
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // For time ranges <= 1 day, return raw minutely data
        // For longer ranges, aggregate by hour
        const shouldAggregate = days > 1;

        let records: any[] = [];

        if (shouldAggregate) {
            // Aggregate records by hour for longer time ranges
            // This dramatically reduces the data size while preserving accuracy
            const aggregatedRecords = await db
                .select({
                    // Use strftime to group by hour
                    hourBucket: sql<string>`strftime('%Y-%m-%d %H:00:00', datetime(${serverUptimeRecords.checkedAt}, 'unixepoch'))`.as('hour_bucket'),
                    online: sql<number>`SUM(CASE WHEN ${serverUptimeRecords.online} = 1 THEN 1 ELSE 0 END)`.as('online_count'),
                    offline: sql<number>`SUM(CASE WHEN ${serverUptimeRecords.online} = 0 THEN 1 ELSE 0 END)`.as('offline_count'),
                    totalChecks: sql<number>`COUNT(*)`.as('total_checks'),
                    avgPlayers: sql<number>`AVG(${serverUptimeRecords.playersOnline})`.as('avg_players'),
                    maxPlayers: sql<number>`MAX(${serverUptimeRecords.playersOnline})`.as('max_players'),
                    maxSlots: sql<number>`MAX(${serverUptimeRecords.playersMax})`.as('max_slots'),
                    avgResponseTime: sql<number>`AVG(${serverUptimeRecords.responseTimeMs})`.as('avg_response_time'),
                })
                .from(serverUptimeRecords)
                .where(
                    and(
                        eq(serverUptimeRecords.serverId, serverId),
                        gte(serverUptimeRecords.checkedAt, startDate)
                    )
                )
                .groupBy(sql`strftime('%Y-%m-%d %H:00:00', datetime(${serverUptimeRecords.checkedAt}, 'unixepoch'))`)
                .orderBy(sql`hour_bucket DESC`);

            // Transform aggregated data into a format compatible with the frontend
            records = aggregatedRecords.map((row: any) => ({
                id: 0, // Aggregated record
                serverId,
                online: row.online > 0, // At least one online check in this hour
                playersOnline: Math.round(row.avgPlayers || 0),
                playersMax: row.maxSlots || 0,
                responseTimeMs: Math.round(row.avgResponseTime || 0),
                checkedAt: row.hourBucket, // ISO string for the hour
                // Additional aggregation data
                _aggregated: true,
                _onlineCount: row.online,
                _offlineCount: row.offline,
                _totalChecks: row.totalChecks,
                _uptimePercent: row.totalChecks > 0 ? (row.online / row.totalChecks) * 100 : 0,
            }));
        } else {
            // For 1 day or less, return raw records (limit to ~1500 for performance)
            const rawRecords = await db
                .select({
                    id: serverUptimeRecords.id,
                    serverId: serverUptimeRecords.serverId,
                    online: serverUptimeRecords.online,
                    playersOnline: serverUptimeRecords.playersOnline,
                    playersMax: serverUptimeRecords.playersMax,
                    responseTimeMs: serverUptimeRecords.responseTimeMs,
                    checkedAt: serverUptimeRecords.checkedAt,
                })
                .from(serverUptimeRecords)
                .where(
                    and(
                        eq(serverUptimeRecords.serverId, serverId),
                        gte(serverUptimeRecords.checkedAt, startDate)
                    )
                )
                .orderBy(desc(serverUptimeRecords.checkedAt))
                .limit(1500);

            records = rawRecords;
        }

        // Calculate overall stats from records
        let totalChecks = 0;
        let onlineChecks = 0;
        let responseTimes: number[] = [];
        let playerCounts: number[] = [];

        if (shouldAggregate) {
            // Stats from aggregated data
            for (const r of records) {
                totalChecks += r._totalChecks || 1;
                onlineChecks += r._onlineCount || (r.online ? 1 : 0);
                if (r.responseTimeMs) responseTimes.push(r.responseTimeMs);
                if (r.playersOnline !== null) playerCounts.push(r.playersOnline);
            }
        } else {
            // Stats from raw data
            totalChecks = records.length;
            onlineChecks = records.filter((r: any) => r.online).length;
            responseTimes = records.filter((r: any) => r.responseTimeMs).map((r: any) => r.responseTimeMs!);
            playerCounts = records.filter((r: any) => r.playersOnline !== null).map((r: any) => r.playersOnline!);
        }

        const uptimePercentage = totalChecks > 0 ? (onlineChecks / totalChecks) * 100 : 0;
        const avgResponseTime = responseTimes.length > 0
            ? Math.round(responseTimes.reduce((a: any, b: any) => Number(a) + Number(b), 0) / responseTimes.length)
            : 0;
        const avgPlayers = playerCounts.length > 0
            ? Math.round(playerCounts.reduce((a: any, b: any) => Number(a) + Number(b), 0) / playerCounts.length)
            : 0;
        const maxPlayers = playerCounts.length > 0 ? Math.max(...playerCounts.map(Number)) : 0;

        return NextResponse.json({
            server: {
                id: server.id,
                name: server.name,
                address: server.ipAddress,
            },
            stats: {
                uptimePercentage,
                avgResponseTime,
                avgPlayers,
                maxPlayers,
                totalChecks,
                onlineChecks,
            },
            records,
            aggregated: shouldAggregate,
        });
    } catch (error: any) {
        console.error('Error fetching server uptime:', error);
        return NextResponse.json({ error: 'Failed to fetch uptime data' }, { status: 500 });
    }
}
