import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { db } from '@/db';
import { socialPosts, socialComments, socialLikes, users } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parseInt(id);

    if (isNaN(postId)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    // Get post with user info
    const [post] = await db
      .select({
        id: socialPosts.id,
        content: socialPosts.content,
        imageUrl: socialPosts.imageUrl,
        likesCount: socialPosts.likesCount,
        commentsCount: socialPosts.commentsCount,
        createdAt: socialPosts.createdAt,
        userId: socialPosts.userId,
        username: users.username,
        minecraftUsername: users.minecraftUsername,
        userRole: users.role,
      })
      .from(socialPosts)
      .leftJoin(users, eq(socialPosts.userId, users.id))
      .where(eq(socialPosts.id, postId));

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Get comments
    const comments = await db
      .select({
        id: socialComments.id,
        content: socialComments.content,
        createdAt: socialComments.createdAt,
        userId: socialComments.userId,
        username: users.username,
        minecraftUsername: users.minecraftUsername,
        userRole: users.role,
      })
      .from(socialComments)
      .leftJoin(users, eq(socialComments.userId, users.id))
      .where(eq(socialComments.postId, postId))
      .orderBy(desc(socialComments.createdAt));

    // Check if current user liked this post
    const session = await auth();
    let userLiked = false;
    if (session?.user) {
      const userId = parseInt(session.user.id as string);
      const like = await db
        .select()
        .from(socialLikes)
        .where(and(eq(socialLikes.postId, postId), eq(socialLikes.userId, userId)))
        .limit(1);
      userLiked = like.length > 0;
    }

    return NextResponse.json({
      ...post,
      comments,
      userLiked,
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}

export async function DELETE(
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
    const userRole = (session.user as any).role;

    // Get the post
    const [post] = await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.id, postId));

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if user owns the post or is admin
    if (post.userId !== userId && !['admin', 'superadmin', 'moderator'].includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await db.delete(socialPosts).where(eq(socialPosts.id, postId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
