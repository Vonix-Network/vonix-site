import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { forumPosts, forumReplies, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notifyForumReply } from '@/lib/notifications';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user as any;

    if (!session || !user) {
      return NextResponse.json({ error: 'You must be signed in to reply' }, { status: 401 });
    }

    const { id } = await params;
    const postId = parseInt(id);

    if (isNaN(postId)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    // Check if post exists and is not locked
    const [post] = await db
      .select()
      .from(forumPosts)
      .where(eq(forumPosts.id, postId))
      .limit(1);

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.isLocked) {
      return NextResponse.json({ error: 'This post is locked' }, { status: 403 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Reply content is required' }, { status: 400 });
    }

    // Create reply
    const [reply] = await db
      .insert(forumReplies)
      .values({
        postId,
        authorId: user.id,
        content: content.trim(),
      })
      .returning();

    // Get author info for response
    const [authorInfo] = await db
      .select({
        username: users.username,
        minecraftUsername: users.minecraftUsername,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    // Send notification to post author (if not replying to own post)
    if (post.authorId !== user.id) {
      const replierName = authorInfo?.username || user.username;
      await notifyForumReply(post.authorId, replierName, postId);
    }

    return NextResponse.json({
      success: true,
      reply: {
        id: reply.id,
        content: reply.content,
        createdAt: reply.createdAt,
        authorId: reply.authorId,
        authorUsername: authorInfo?.username || user.username,
        authorMinecraft: authorInfo?.minecraftUsername,
        authorRole: authorInfo?.role || 'user',
      },
    });
  } catch (error) {
    console.error('Error creating reply:', error);
    return NextResponse.json({ error: 'Failed to post reply' }, { status: 500 });
  }
}

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

    const replies = await db
      .select({
        id: forumReplies.id,
        content: forumReplies.content,
        createdAt: forumReplies.createdAt,
        authorId: forumReplies.authorId,
        authorUsername: users.username,
        authorMinecraft: users.minecraftUsername,
        authorRole: users.role,
      })
      .from(forumReplies)
      .leftJoin(users, eq(forumReplies.authorId, users.id))
      .where(eq(forumReplies.postId, postId))
      .orderBy(forumReplies.createdAt);

    return NextResponse.json(replies);
  } catch (error) {
    console.error('Error fetching replies:', error);
    return NextResponse.json({ error: 'Failed to fetch replies' }, { status: 500 });
  }
}
