import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/db
 * Check database connection health and latency
 */
export async function GET() {
    const startTime = Date.now();

    try {
        // Simple query to check DB connection
        await db.run(sql`SELECT 1`);

        const latency = Date.now() - startTime;

        return NextResponse.json({
            status: latency < 100 ? 'online' : latency < 500 ? 'degraded' : 'offline',
            latency,
            message: 'Database connection successful',
        });
    } catch (error) {
        console.error('Database health check failed:', error);

        return NextResponse.json({
            status: 'offline',
            latency: 0,
            message: 'Database connection failed',
            error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 503 });
    }
}
