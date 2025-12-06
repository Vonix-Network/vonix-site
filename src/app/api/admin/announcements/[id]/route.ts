import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { db } from '@/db';
import { announcements } from '@/db/schema';
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
 * GET /api/admin/announcements/[id]
 * Get single announcement
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        await requireAdmin();
        const { id } = await params;
        const announcementId = parseInt(id);

        const [announcement] = await db
            .select()
            .from(announcements)
            .where(eq(announcements.id, announcementId));

        if (!announcement) {
            return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
        }

        return NextResponse.json(announcement);
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to fetch announcement' }, { status: 500 });
    }
}

/**
 * PUT /api/admin/announcements/[id]
 * Update announcement
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        await requireAdmin();
        const { id } = await params;
        const announcementId = parseInt(id);
        const body = await request.json();

        const { title, content, type, published, expiresAt } = body;

        const [updated] = await db
            .update(announcements)
            .set({
                title: title !== undefined ? title : undefined,
                content: content !== undefined ? content : undefined,
                type: type !== undefined ? type : undefined,
                published: published !== undefined ? published : undefined,
                expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined,
                updatedAt: new Date(),
            })
            .where(eq(announcements.id, announcementId))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, announcement: updated });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error updating announcement:', error);
        return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/announcements/[id]
 * Delete announcement
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        await requireAdmin();
        const { id } = await params;
        const announcementId = parseInt(id);

        await db.delete(announcements).where(eq(announcements.id, announcementId));

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error deleting announcement:', error);
        return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 });
    }
}
