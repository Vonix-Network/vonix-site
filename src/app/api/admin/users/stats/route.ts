import { NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { sql } from 'drizzle-orm';

async function requireAdmin() {
    const session = await auth();
    const user = session?.user as any;

    if (!session || !['admin', 'superadmin', 'moderator'].includes(user?.role)) {
        throw new Error('Unauthorized');
    }

    return user;
}

/**
 * GET /api/admin/users/stats
 * Get user statistics for admin dashboard
 */
export async function GET() {
    try {
        await requireAdmin();

        const [total, admins, mods, today] = await Promise.all([
            db.select({ count: sql<number>`count(*)` }).from(users),
            db.select({ count: sql<number>`count(*)` }).from(users).where(sql`${users.role} IN ('admin', 'superadmin')`),
            db.select({ count: sql<number>`count(*)` }).from(users).where(sql`${users.role} = 'moderator'`),
            db.select({ count: sql<number>`count(*)` }).from(users).where(sql`date(${users.createdAt}, 'unixepoch') = date('now')`),
        ]);

        return NextResponse.json({
            total: total[0]?.count || 0,
            admins: admins[0]?.count || 0,
            mods: mods[0]?.count || 0,
            today: today[0]?.count || 0,
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error fetching user stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stats' },
            { status: 500 }
        );
    }
}

