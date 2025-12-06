import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { socialPosts, users } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { notifyPostLike } from '@/lib/notifications';

/**
 * POST /api/social/posts/[id]/like
 * Toggle like on a social post
 * Note: Without a dedicated likes table, we simply increment/decrement the counter
 * This means the same user could like multiple times - for proper tracking,
 * a socialLikes table would need to be added to the schema
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const postId = parseInt(id);
    const userId = parseInt(session.user.id as string);

    if (isNaN(postId)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    // Get the post to check ownership
    const [post] = await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.id, postId));

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Prevent self-liking
    if (post.userId === userId) {
      return NextResponse.json(
        { error: 'You cannot like your own post', selfLike: true },
        { status: 400 }
      );
    }

    // Increment likes count (without a likes table, we can't track individual likes)
    await db
      .update(socialPosts)
      .set({ likesCount: sql`COALESCE(${socialPosts.likesCount}, 0) + 1` })
      .where(eq(socialPosts.id, postId));

    // Send notification to post owner
    const [liker] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (liker) {
      await notifyPostLike(post.userId, liker.username, postId);
    }

    return NextResponse.json({ liked: true, message: 'Post liked' });
  } catch (error) {
    console.error('Error toggling like:', error);
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 });
  }
}

// Get like count for a post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parseInt(id);

    const [post] = await db
      .select({ likesCount: socialPosts.likesCount })
      .from(socialPosts)
      .where(eq(socialPosts.id, postId))
      .limit(1);

    return NextResponse.json({ likes: post?.likesCount || 0 });
  } catch (error) {
    console.error('Error getting likes:', error);
    return NextResponse.json({ likes: 0 });
  }
}
