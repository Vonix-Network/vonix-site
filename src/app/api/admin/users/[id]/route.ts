import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

async function requireAdmin() {
    const session = await auth();
    const user = session?.user as any;

    if (!session || !['admin', 'superadmin'].includes(user?.role)) {
        throw new Error('Unauthorized');
    }

    return user;
}

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/users/[id]
 * Get single user details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        await requireAdmin();
        const { id } = await params;
        const userId = parseInt(id);

        const [user] = await db.select().from(users).where(eq(users.id, userId));

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Don't return password
        const { password, ...userData } = user;
        return NextResponse.json(userData);
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    }
}

/**
 * PUT /api/admin/users/[id]
 * Update user (including rank management)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const adminUser = await requireAdmin();
        const { id } = await params;
        const userId = parseInt(id);
        const body = await request.json();

        const {
            role,
            email,
            minecraftUsername,
            bio,
            // Rank management fields
            donationRankId,
            rankExpiresAt,
            totalDonated,
            subscriptionStatus,
        } = body;

        // Prevent non-superadmins from creating superadmins
        if (role === 'superadmin' && adminUser.role !== 'superadmin') {
            return NextResponse.json(
                { error: 'Only superadmins can assign superadmin role' },
                { status: 403 }
            );
        }

        // Build update object
        const updateData: Record<string, any> = {
            updatedAt: new Date(),
        };

        // Basic fields
        if (role !== undefined) updateData.role = role;
        if (email !== undefined) updateData.email = email;
        if (minecraftUsername !== undefined) updateData.minecraftUsername = minecraftUsername;
        if (bio !== undefined) updateData.bio = bio;

        // Rank management fields
        if (donationRankId !== undefined) updateData.donationRankId = donationRankId || null;
        if (rankExpiresAt !== undefined) {
            updateData.rankExpiresAt = rankExpiresAt ? new Date(rankExpiresAt) : null;
        }
        if (totalDonated !== undefined) updateData.totalDonated = parseFloat(totalDonated) || 0;
        if (subscriptionStatus !== undefined) updateData.subscriptionStatus = subscriptionStatus || null;

        const [updated] = await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, userId))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const { password, ...userData } = updated;
        return NextResponse.json({ success: true, user: userData });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/users/[id]
 * Delete user
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const adminUser = await requireAdmin();
        const { id } = await params;
        const userId = parseInt(id);

        // Get user to check role
        const [targetUser] = await db.select().from(users).where(eq(users.id, userId));

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Prevent deleting superadmins unless you are one
        if (targetUser.role === 'superadmin' && adminUser.role !== 'superadmin') {
            return NextResponse.json(
                { error: 'Cannot delete superadmin users' },
                { status: 403 }
            );
        }

        // Prevent deleting yourself
        if (targetUser.id === adminUser.id) {
            return NextResponse.json(
                { error: 'Cannot delete your own account' },
                { status: 400 }
            );
        }

        await db.delete(users).where(eq(users.id, userId));

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
