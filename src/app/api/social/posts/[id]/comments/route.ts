import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { socialPosts, socialComments, users } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { notifyPostComment } from '@/lib/notifications';

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

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

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

    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (content.length > 500) {
      return NextResponse.json({ error: 'Comment too long (max 500 chars)' }, { status: 400 });
    }

    // Check if post exists
    const [post] = await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.id, postId));

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Create comment
    const [comment] = await db.insert(socialComments).values({
      postId,
      userId,
      content: content.trim(),
    }).returning();

    // Increment comments count
    await db
      .update(socialPosts)
      .set({ commentsCount: sql`${socialPosts.commentsCount} + 1` })
      .where(eq(socialPosts.id, postId));

    // Send notification to post owner (if not commenting on own post)
    if (post.userId !== userId) {
      const [commenter] = await db
        .select({ username: users.username })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (commenter) {
        await notifyPostComment(post.userId, commenter.username, postId);
      }
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
