import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { forumPosts, forumCategories, users } from '@/db/schema';
import { desc, eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = db
      .select({
        id: forumPosts.id,
        title: forumPosts.title,
        content: forumPosts.content,
        views: forumPosts.views,
        pinned: forumPosts.pinned,
        locked: forumPosts.locked,
        createdAt: forumPosts.createdAt,
        updatedAt: forumPosts.updatedAt,
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
      .orderBy(desc(forumPosts.pinned), desc(forumPosts.createdAt))
      .limit(limit)
      .offset(offset);

    if (categoryId) {
      query = query.where(eq(forumPosts.categoryId, parseInt(categoryId))) as any;
    }

    const posts = await query;

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching forum posts:', error);
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
    const { title, content, categoryId } = body;

    if (!title || !content || !categoryId) {
      return NextResponse.json(
        { error: 'Title, content, and category are required' },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: 'Title must be 200 characters or less' },
        { status: 400 }
      );
    }

    if (content.length > 10000) {
      return NextResponse.json(
        { error: 'Content must be 10000 characters or less' },
        { status: 400 }
      );
    }

    // Verify category exists
    const category = await db.query.forumCategories.findFirst({
      where: eq(forumCategories.id, categoryId),
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    const userId = parseInt(session.user.id as string);

    const [newPost] = await db.insert(forumPosts).values({
      title: title.trim(),
      content: content.trim(),
      categoryId,
      authorId: userId,
      views: 0,
      pinned: false,
      locked: false,
    }).returning();

    return NextResponse.json(newPost, { status: 201 });
  } catch (error) {
    console.error('Error creating forum post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
