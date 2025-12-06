import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { db } from '@/db';
import { forumPosts, auditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function requireModerator() {
    const session = await auth();
    const user = session?.user as any;

    if (!session || !['admin', 'superadmin', 'moderator'].includes(user?.role)) {
        throw new Error('Unauthorized');
    }

    return user;
}

/**
 * POST /api/admin/moderation/lock-post
 * Lock a forum post by ID
 */
export async function POST(request: NextRequest) {
    try {
        const adminUser = await requireModerator();
        const body = await request.json();
        const { postId, reason } = body;

        if (!postId) {
            return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
        }

        // Find and lock the post
        const [post] = await db
            .select()
            .from(forumPosts)
            .where(eq(forumPosts.id, postId));

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        if (post.locked) {
            return NextResponse.json({ error: 'Post is already locked' }, { status: 400 });
        }

        await db
            .update(forumPosts)
            .set({
                locked: true,
                updatedAt: new Date(),
            })
            .where(eq(forumPosts.id, postId));

        // Log the action
        await db.insert(auditLogs).values({
            userId: adminUser.id,
            action: 'lock_post',
            resource: 'forum_post',
            resourceId: postId.toString(),
            details: JSON.stringify({ title: post.title, reason }),
        });

        return NextResponse.json({ success: true, message: 'Post locked' });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Error locking post:', error);
        return NextResponse.json({ error: 'Failed to lock post' }, { status: 500 });
    }
}
