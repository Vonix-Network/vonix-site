import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { servers, serverUptimeRecords } from '@/db/schema';
import { desc, gte } from 'drizzle-orm';

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
 * 
 * Chart granularity based on days:
 * - 1 day (24h): Every 5 minutes (288 data points)
 * - 7 days: Hourly (168 data points)
 * - 30 days: Every 4 hours (180 data points)
 * - 90 days: Every 12 hours (180 data points)
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
                address: servers.ipAddress,
            })
            .from(servers)
            .orderBy(servers.id);

        // Calculate date range
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Math.min(days, 90)); // Max 90 days

        // Get uptime records
        let records = await db
            .select()
            .from(serverUptimeRecords)
            .where(gte(serverUptimeRecords.checkedAt, startDate))
            .orderBy(desc(serverUptimeRecords.checkedAt));

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

        // Determine granularity based on days selected
        // 1 day = 5 minute intervals, 7 days = hourly, 30+ days = multi-hour
        let granularityMinutes: number;
        if (days <= 1) {
            granularityMinutes = 5; // 5-minute intervals for 24 hours
        } else if (days <= 7) {
            granularityMinutes = 60; // Hourly for 7 days
        } else if (days <= 30) {
            granularityMinutes = 240; // 4-hour intervals for 30 days
        } else {
            granularityMinutes = 720; // 12-hour intervals for 90 days
        }

        // Group records by the appropriate time interval
        const chartData: Record<string, { timestamp: string; online: number; offline: number }> = {};

        records.forEach(record => {
            const recordTime = new Date(record.checkedAt);
            // Round down to the nearest interval
            const intervalMs = granularityMinutes * 60 * 1000;
            const roundedTime = new Date(Math.floor(recordTime.getTime() / intervalMs) * intervalMs);
            const key = roundedTime.toISOString();

            if (!chartData[key]) {
                chartData[key] = { timestamp: key, online: 0, offline: 0 };
            }
            if (record.online) {
                chartData[key].online++;
            } else {
                chartData[key].offline++;
            }
        });

        // Sort chart data chronologically
        const sortedChartData = Object.values(chartData).sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        return NextResponse.json({
            servers: allServers,
            uptimeStats,
            chartData: sortedChartData,
            records: records.slice(0, 100), // Limit to recent 100 records for the table
            meta: {
                granularityMinutes,
                totalRecords: records.length,
                chartPoints: sortedChartData.length,
            }
        });
    } catch (error: any) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error fetching uptime data:', error);
        return NextResponse.json({ error: 'Failed to fetch uptime data' }, { status: 500 });
    }
}

