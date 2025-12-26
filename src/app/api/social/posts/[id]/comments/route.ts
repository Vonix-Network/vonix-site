import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { socialPosts, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Comments API for social posts
 * NOTE: The socialComments table does not exist in the current schema.
 * This is a placeholder that returns empty data until the schema is extended.
 */

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

    // Check if post exists
    const [post] = await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.id, postId));

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Comments table doesn't exist in schema - return empty array
    return NextResponse.json([]);
  } catch (error: any) {
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

    if (isNaN(postId)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    // Check if post exists
    const [post] = await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.id, postId));

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Comments table doesn't exist in schema - feature not available
    return NextResponse.json(
      { error: 'Comments feature not available. Schema needs to be extended.' },
      { status: 501 }
    );
  } catch (error: any) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
