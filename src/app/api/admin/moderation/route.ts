import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { users, forumPosts, auditLogs, reportedContent } from '@/db/schema';
import { desc, sql, eq } from 'drizzle-orm';

async function requireModerator() {
    const session = await auth();
    const user = session?.user as any;

    if (!session || !['admin', 'superadmin', 'moderator'].includes(user?.role)) {
        throw new Error('Unauthorized');
    }

    return user;
}

/**
 * GET /api/admin/moderation
 * Get moderation statistics and data
 */
export async function GET() {
    try {
        await requireModerator();

        // Get stats
        const [bannedCount, lockedPosts] = await Promise.all([
            db.select({ count: sql<number>`count(*)` })
                .from(users)
                .where(sql`${users.lockedUntil} > unixepoch()`),
            db.select({ count: sql<number>`count(*)` })
                .from(forumPosts)
                .where(eq(forumPosts.locked, true)),
        ]);

        // Get pending reports
        const reports = await db
            .select()
            .from(reportedContent)
            .where(eq(reportedContent.status, 'pending'))
            .orderBy(desc(reportedContent.createdAt))
            .limit(20);

        // Get recent audit logs
        const logs = await db
            .select()
            .from(auditLogs)
            .orderBy(desc(auditLogs.createdAt))
            .limit(50);

        return NextResponse.json({
            stats: {
                bannedUsers: bannedCount[0]?.count || 0,
                lockedPosts: lockedPosts[0]?.count || 0,
                pendingReports: reports.length,
                recentActions: logs.length,
            },
            reports,
            auditLogs: logs,
        });
    } catch (error: any) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error fetching moderation data:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}

