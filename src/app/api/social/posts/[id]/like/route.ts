import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { socialPosts, socialLikes, users } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { notifyPostLike } from '@/lib/notifications';

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

    // Check if already liked
    const existingLike = await db
      .select()
      .from(socialLikes)
      .where(and(eq(socialLikes.postId, postId), eq(socialLikes.userId, userId)))
      .limit(1);

    if (existingLike.length > 0) {
      // Unlike - remove the like
      await db
        .delete(socialLikes)
        .where(and(eq(socialLikes.postId, postId), eq(socialLikes.userId, userId)));

      // Decrement likes count
      await db
        .update(socialPosts)
        .set({ likesCount: sql`${socialPosts.likesCount} - 1` })
        .where(eq(socialPosts.id, postId));

      return NextResponse.json({ liked: false, message: 'Post unliked' });
    } else {
      // Like - add the like
      await db.insert(socialLikes).values({
        postId,
        userId,
      });

      // Increment likes count
      await db
        .update(socialPosts)
        .set({ likesCount: sql`${socialPosts.likesCount} + 1` })
        .where(eq(socialPosts.id, postId));

      // Send notification to post owner (if not self-liking)
      if (post.userId !== userId) {
        const [liker] = await db
          .select({ username: users.username })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (liker) {
          await notifyPostLike(post.userId, liker.username, postId);
        }
      }

      return NextResponse.json({ liked: true, message: 'Post liked' });
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 });
  }
}

// Get like status for current user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ liked: false });
    }

    const { id } = await params;
    const postId = parseInt(id);
    const userId = parseInt(session.user.id as string);

    const like = await db
      .select()
      .from(socialLikes)
      .where(and(eq(socialLikes.postId, postId), eq(socialLikes.userId, userId)))
      .limit(1);

    return NextResponse.json({ liked: like.length > 0 });
  } catch (error) {
    console.error('Error checking like:', error);
    return NextResponse.json({ liked: false });
  }
}
