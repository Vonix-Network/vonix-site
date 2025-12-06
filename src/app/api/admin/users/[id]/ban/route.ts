import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { users, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function requireAdmin() {
    const session = await auth();
    const user = session?.user as any;

    if (!session || !['admin', 'superadmin', 'moderator'].includes(user?.role)) {
        throw new Error('Unauthorized');
    }

    return user;
}

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/users/[id]/ban
 * Ban a user
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const adminUser = await requireAdmin();
        const { id } = await params;
        const userId = parseInt(id);

        // Get user to check role
        const [targetUser] = await db.select().from(users).where(eq(users.id, userId));

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
            return NextResponse.json(
                { error: 'Cannot ban yourself' },
                { status: 400 }
            );
        }

        // Update user role to 'banned' (using a locked state or special role)
        // Since the schema doesn't have 'banned' as a role, we'll set lockedUntil to far future
        const farFuture = new Date('2099-12-31');

        await db
            .update(users)
            .set({
                lockedUntil: farFuture,
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

        // Log the action
        await db.insert(auditLogs).values({
            userId: adminUser.id,
            action: 'ban_user',
            resource: 'user',
            resourceId: userId.toString(),
            details: JSON.stringify({ username: targetUser.username }),
        });

        return NextResponse.json({ success: true, message: 'User banned successfully' });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error banning user:', error);
        return NextResponse.json({ error: 'Failed to ban user' }, { status: 500 });
    }
}
