import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { db } from '@/db';
import { users, auditLogs } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

async function requireModerator() {
    const session = await auth();
    const user = session?.user as any;

    if (!session || !['admin', 'superadmin', 'moderator'].includes(user?.role)) {
        throw new Error('Unauthorized');
    }

    return user;
}

/**
 * POST /api/admin/moderation/ban
 * Ban a user by username
 */
export async function POST(request: NextRequest) {
    try {
        const adminUser = await requireModerator();
        const body = await request.json();
        const { username, reason } = body;

        if (!username) {
            return NextResponse.json({ error: 'Username is required' }, { status: 400 });
        }

        // Find user
        const [targetUser] = await db
            .select()
            .from(users)
            .where(sql`LOWER(${users.username}) = LOWER(${username})`);

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Prevent banning admins/superadmins unless you're a superadmin
        if (['admin', 'superadmin'].includes(targetUser.role) && adminUser.role !== 'superadmin') {
            return NextResponse.json(
                { error: 'Cannot ban admin users' },
                { status: 403 }
            );
        }

        // Prevent banning yourself
        if (targetUser.id === adminUser.id) {
            return NextResponse.json({ error: 'Cannot ban yourself' }, { status: 400 });
        }

        // Ban by setting lockedUntil to far future
        const farFuture = new Date('2099-12-31');

        await db
            .update(users)
            .set({
                lockedUntil: farFuture,
                updatedAt: new Date(),
            })
            .where(eq(users.id, targetUser.id));

        // Log the action
        await db.insert(auditLogs).values({
            userId: adminUser.id,
            action: 'ban_user',
            resource: 'user',
            resourceId: targetUser.id.toString(),
            details: JSON.stringify({ username: targetUser.username, reason }),
        });

        return NextResponse.json({ success: true, message: `User "${username}" banned` });
    } catch (error: any) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error banning user:', error);
        return NextResponse.json({ error: 'Failed to ban user' }, { status: 500 });
    }
}

