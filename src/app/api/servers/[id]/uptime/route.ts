import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { serverUptimeRecords, servers } from '@/db/schema';
import { eq, desc, gte, and } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/servers/[id]/uptime
 * Get uptime history for a specific server
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

        // Get uptime records for this server
        const records = await db
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
            .limit(2000); // Limit to prevent huge responses

        // Calculate stats
        const totalChecks = records.length;
        const onlineChecks = records.filter(r => r.online).length;
        const uptimePercentage = totalChecks > 0 ? (onlineChecks / totalChecks) * 100 : 0;

        const responseTimes = records.filter(r => r.responseTimeMs).map(r => r.responseTimeMs!);
        const avgResponseTime = responseTimes.length > 0
            ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
            : 0;

        const playerCounts = records.filter(r => r.playersOnline !== null).map(r => r.playersOnline!);
        const avgPlayers = playerCounts.length > 0
            ? Math.round(playerCounts.reduce((a, b) => a + b, 0) / playerCounts.length)
            : 0;
        const maxPlayers = playerCounts.length > 0 ? Math.max(...playerCounts) : 0;

        return NextResponse.json({
            server: {
                id: server.id,
                name: server.name,
                ipAddress: server.ipAddress,
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
        });
    } catch (error) {
        console.error('Error fetching server uptime:', error);
        return NextResponse.json({ error: 'Failed to fetch uptime data' }, { status: 500 });
    }
}
