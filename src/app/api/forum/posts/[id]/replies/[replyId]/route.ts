import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../../auth';
import { db } from '@/db';
import { forumReplies } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; replyId: string }> }
) {
    try {
        const session = await auth();
        const user = session?.user as any;

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { replyId } = await params;
        const replyIdNum = parseInt(replyId);

        if (isNaN(replyIdNum)) {
            return NextResponse.json({ error: 'Invalid reply ID' }, { status: 400 });
        }

        // Get reply to check ownership
        const [reply] = await db
            .select()
            .from(forumReplies)
            .where(eq(forumReplies.id, replyIdNum))
            .limit(1);

        if (!reply) {
            return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
        }

        // Check if user can edit (owner or admin/mod)
        const canEdit = reply.authorId === user.id ||
            ['admin', 'superadmin', 'moderator'].includes(user.role);

        if (!canEdit) {
            return NextResponse.json({ error: 'Not authorized to edit this reply' }, { status: 403 });
        }

        const body = await request.json();
        const { content } = body;

        if (!content?.trim()) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        // Update reply
        const [updatedReply] = await db
            .update(forumReplies)
            .set({
                content: content.trim().substring(0, 5000),
                updatedAt: new Date(),
            })
            .where(eq(forumReplies.id, replyIdNum))
            .returning();

        return NextResponse.json({ success: true, reply: updatedReply });
    } catch (error) {
        console.error('Error updating reply:', error);
        return NextResponse.json({ error: 'Failed to update reply' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; replyId: string }> }
) {
    try {
        const session = await auth();
        const user = session?.user as any;

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { replyId } = await params;
        const replyIdNum = parseInt(replyId);

        if (isNaN(replyIdNum)) {
            return NextResponse.json({ error: 'Invalid reply ID' }, { status: 400 });
        }

        // Get reply to check ownership
        const [reply] = await db
            .select()
            .from(forumReplies)
            .where(eq(forumReplies.id, replyIdNum))
            .limit(1);

        if (!reply) {
            return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
        }

        // Check if user can delete (owner or admin/mod)
        const canDelete = reply.authorId === user.id ||
            ['admin', 'superadmin', 'moderator'].includes(user.role);

        if (!canDelete) {
            return NextResponse.json({ error: 'Not authorized to delete this reply' }, { status: 403 });
        }

        // Delete reply
        await db.delete(forumReplies).where(eq(forumReplies.id, replyIdNum));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting reply:', error);
        return NextResponse.json({ error: 'Failed to delete reply' }, { status: 500 });
    }
}
