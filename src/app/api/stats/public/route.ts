import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, donations, servers } from '@/db/schema';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const [userCount, donationStats, serverCount] = await Promise.all([
            db.select({ count: sql<number>`count(*)` }).from(users),
            db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(donations),
            db.select({ count: sql<number>`count(*)` }).from(servers),
        ]);

        return NextResponse.json({
            users: userCount[0]?.count || 0,
            donations: donationStats[0]?.total || 0,
            servers: serverCount[0]?.count || 0,
        });
    } catch (error: any) {
        console.error('Error fetching public stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stats' },
            { status: 500 }
        );
    }
}

