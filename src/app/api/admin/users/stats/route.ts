import { NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { sql, eq, gte } from 'drizzle-orm';

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

        // Calculate today's start date
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [total, admins, mods, today] = await Promise.all([
            db.select({ count: sql<number>`count(*)` }).from(users),
            db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'admin')),
            db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'moderator')),
            db.select({ count: sql<number>`count(*)` }).from(users).where(gte(users.createdAt, todayStart)),
        ]);

        // Also count superadmins as admins
        const [superadmins] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'superadmin'));

        return NextResponse.json({
            total: Number(total[0]?.count || 0),
            admins: Number(admins[0]?.count || 0) + Number(superadmins?.count || 0),
            mods: Number(mods[0]?.count || 0),
            today: Number(today[0]?.count || 0),
        });
    } catch (error: any) {
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
