import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { socialPosts, users } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

// Force dynamic - always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const posts = await db
      .select({
        id: socialPosts.id,
        content: socialPosts.content,
        likesCount: socialPosts.likesCount,
        createdAt: socialPosts.createdAt,
        userId: socialPosts.userId,
        username: users.username,
        minecraftUsername: users.minecraftUsername,
        userRole: users.role,
      })
      .from(socialPosts)
      .leftJoin(users, eq(socialPosts.userId, users.id))
      .orderBy(desc(socialPosts.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        { error: 'Content must be 500 characters or less' },
        { status: 400 }
      );
    }

    const userId = parseInt(session.user.id as string);

    const [newPost] = await db.insert(socialPosts).values({
      userId: userId,
      content: content.trim(),
      likesCount: 0,
    }).returning();

    return NextResponse.json(newPost, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}

