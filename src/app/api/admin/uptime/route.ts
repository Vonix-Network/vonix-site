import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { servers, serverUptimeRecords } from '@/db/schema';
import { desc, eq, sql, and, gte } from 'drizzle-orm';

async function requireAdmin() {
    const session = await auth();
    const user = session?.user as any;

    if (!session || !['admin', 'superadmin', 'moderator'].includes(user?.role)) {
        throw new Error('Unauthorized');
    }

    return user;
}

/**
 * GET /api/admin/uptime
 * Get server uptime data for analytics
 */
export async function GET(request: NextRequest) {
    try {
        await requireAdmin();

        const { searchParams } = new URL(request.url);
        const serverId = searchParams.get('serverId');
        const days = parseInt(searchParams.get('days') || '7');

        // Get all servers for dropdown
        const allServers = await db
            .select({
                id: servers.id,
                name: servers.name,
                ipAddress: servers.ipAddress,
            })
            .from(servers)
            .orderBy(servers.orderIndex);

        // Calculate date range
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Math.min(days, 90)); // Max 90 days

        // Get uptime records
        let uptimeQuery = db
            .select()
            .from(serverUptimeRecords)
            .where(gte(serverUptimeRecords.checkedAt, startDate))
            .orderBy(desc(serverUptimeRecords.checkedAt));

        let records = await uptimeQuery;

        // Filter by server if specified
        if (serverId && serverId !== 'all') {
            records = records.filter(r => r.serverId === parseInt(serverId));
        }

        // Calculate uptime percentage per server
        const serverStats: Record<number, { total: number; online: number; avgResponseTime: number }> = {};

        records.forEach(record => {
            if (!serverStats[record.serverId]) {
                serverStats[record.serverId] = { total: 0, online: 0, avgResponseTime: 0 };
            }
            serverStats[record.serverId].total++;
            if (record.online) {
                serverStats[record.serverId].online++;
            }
            if (record.responseTimeMs) {
                serverStats[record.serverId].avgResponseTime += record.responseTimeMs;
            }
        });

        // Calculate percentages
        const uptimeStats = Object.entries(serverStats).map(([id, stats]) => ({
            serverId: parseInt(id),
            uptimePercentage: stats.total > 0 ? (stats.online / stats.total) * 100 : 0,
            avgResponseTime: stats.online > 0 ? Math.round(stats.avgResponseTime / stats.online) : 0,
            totalChecks: stats.total,
            onlineChecks: stats.online,
        }));

        // Group records by hour for chart data
        const chartData: Record<string, { timestamp: string; online: number; offline: number }> = {};

        records.forEach(record => {
            const hour = new Date(record.checkedAt).toISOString().substring(0, 13) + ':00:00';
            if (!chartData[hour]) {
                chartData[hour] = { timestamp: hour, online: 0, offline: 0 };
            }
            if (record.online) {
                chartData[hour].online++;
            } else {
                chartData[hour].offline++;
            }
        });

        return NextResponse.json({
            servers: allServers,
            uptimeStats,
            chartData: Object.values(chartData).sort((a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            ),
            records: records.slice(0, 100), // Limit to recent 100 records
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error fetching uptime data:', error);
        return NextResponse.json({ error: 'Failed to fetch uptime data' }, { status: 500 });
    }
}
