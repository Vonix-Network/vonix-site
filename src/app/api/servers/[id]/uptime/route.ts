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
            // For aggregation, fetch raw records and aggregate in JS
            // This avoids SQLite-specific strftime issues with Turso
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
                .orderBy(desc(serverUptimeRecords.checkedAt));

            // Aggregate by hour in JavaScript
            const hourlyMap = new Map<string, {
                online: number;
                offline: number;
                players: number[];
                maxSlots: number;
                responseTimes: number[];
                date: Date;
            }>();

            for (const record of rawRecords) {
                const date = record.checkedAt instanceof Date
                    ? record.checkedAt
                    : new Date(record.checkedAt as any);

                // Create hour key: YYYY-MM-DDTHH
                const hourKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}`;

                if (!hourlyMap.has(hourKey)) {
                    hourlyMap.set(hourKey, {
                        online: 0,
                        offline: 0,
                        players: [],
                        maxSlots: 0,
                        responseTimes: [],
                        date: new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()),
                    });
                }

                const bucket = hourlyMap.get(hourKey)!;
                // Handle PostgreSQL bigint (1/0) as boolean
                if (Boolean(record.online)) {
                    bucket.online++;
                } else {
                    bucket.offline++;
                }
                if (record.playersOnline != null) {
                    bucket.players.push(Number(record.playersOnline));
                }
                if (record.playersMax) {
                    bucket.maxSlots = Math.max(bucket.maxSlots, Number(record.playersMax));
                }
                if (record.responseTimeMs) {
                    bucket.responseTimes.push(Number(record.responseTimeMs));
                }
            }

            // Convert to records array
            const sortedKeys = Array.from(hourlyMap.keys()).sort();
            records = sortedKeys.map(key => {
                const bucket = hourlyMap.get(key)!;
                const totalChecks = bucket.online + bucket.offline;
                const avgPlayers = bucket.players.length > 0
                    ? Math.round(bucket.players.reduce((a, b) => a + b, 0) / bucket.players.length)
                    : 0;
                const avgResponseTime = bucket.responseTimes.length > 0
                    ? Math.round(bucket.responseTimes.reduce((a, b) => a + b, 0) / bucket.responseTimes.length)
                    : 0;

                return {
                    id: 0,
                    serverId,
                    online: bucket.online > 0,
                    playersOnline: avgPlayers,
                    playersMax: bucket.maxSlots,
                    responseTimeMs: avgResponseTime,
                    checkedAt: bucket.date.toISOString(),
                    _aggregated: true,
                    _onlineCount: bucket.online,
                    _offlineCount: bucket.offline,
                    _totalChecks: totalChecks,
                    _uptimePercent: totalChecks > 0 ? (bucket.online / totalChecks) * 100 : 0,
                };
            });
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

            // Convert numbers and booleans properly (handles PostgreSQL bigint issues)
            records = rawRecords.map((r: any) => ({
                ...r,
                online: Boolean(r.online), // Ensure it's a proper boolean (handles 1/0 from bigint)
                playersOnline: r.playersOnline != null ? Number(r.playersOnline) : null,
                playersMax: r.playersMax != null ? Number(r.playersMax) : null,
                responseTimeMs: r.responseTimeMs != null ? Number(r.responseTimeMs) : null,
            }));
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
