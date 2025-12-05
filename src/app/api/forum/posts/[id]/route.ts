import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { db } from '@/db';
import { forumPosts, forumReplies, forumCategories, users } from '@/db/schema';
import { eq, sql, and } from 'drizzle-orm';

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

    // Increment view count
    await db
      .update(forumPosts)
      .set({ views: sql`${forumPosts.views} + 1` })
      .where(eq(forumPosts.id, postId));

    // Get post with author and category info
    const [post] = await db
      .select({
        id: forumPosts.id,
        title: forumPosts.title,
        content: forumPosts.content,
        createdAt: forumPosts.createdAt,
        views: forumPosts.views,
        pinned: forumPosts.pinned,
        locked: forumPosts.locked,
        authorId: forumPosts.authorId,
        authorUsername: users.username,
        authorMinecraft: users.minecraftUsername,
        authorRole: users.role,
        categoryId: forumPosts.categoryId,
        categoryName: forumCategories.name,
        categorySlug: forumCategories.slug,
      })
      .from(forumPosts)
      .leftJoin(users, eq(forumPosts.authorId, users.id))
      .leftJoin(forumCategories, eq(forumPosts.categoryId, forumCategories.id))
      .where(eq(forumPosts.id, postId))
      .limit(1);

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Get replies
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

    return NextResponse.json({ post, replies });
  } catch (error) {
    console.error('Error fetching forum post:', error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user as any;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const postId = parseInt(id);
    
    if (isNaN(postId)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    // Get post to check ownership
    const [post] = await db
      .select()
      .from(forumPosts)
      .where(eq(forumPosts.id, postId))
      .limit(1);

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if user can delete (owner or admin/mod)
    const canDelete = post.authorId === user.id || 
      ['admin', 'superadmin', 'moderator'].includes(user.role);

    if (!canDelete) {
      return NextResponse.json({ error: 'Not authorized to delete this post' }, { status: 403 });
    }

    // Delete post (cascade will handle replies)
    await db.delete(forumPosts).where(eq(forumPosts.id, postId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting forum post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
