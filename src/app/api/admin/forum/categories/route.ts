import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { db } from '@/db';
import { forumCategories } from '@/db/schema';
import { eq, asc, sql } from 'drizzle-orm';

// Helper to check admin
async function requireAdmin() {
  const session = await auth();
  const user = session?.user as any;

  if (!session || !['admin', 'superadmin', 'moderator'].includes(user?.role)) {
    throw new Error('Unauthorized');
  }

  return user;
}

export async function GET() {
  try {
    await requireAdmin();

    // Get categories with post counts
    const categoriesWithCounts = await db
      .select({
        id: forumCategories.id,
        name: forumCategories.name,
        slug: forumCategories.slug,
        description: forumCategories.description,
        icon: forumCategories.icon,
        color: forumCategories.color,
        order: forumCategories.order,
        minRole: forumCategories.minRole,
        isPrivate: forumCategories.isPrivate,
        createdAt: forumCategories.createdAt,
        postCount: sql<number>`(SELECT COUNT(*) FROM forum_posts WHERE forum_posts.category_id = ${forumCategories.id})`,
      })
      .from(forumCategories)
      .orderBy(asc(forumCategories.order));

    return NextResponse.json(categoriesWithCounts, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    console.error('Error fetching forum categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { name, slug, description, icon, color, order, minRole, isPrivate } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Check if slug exists
    const existing = await db
      .select()
      .from(forumCategories)
      .where(eq(forumCategories.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'A category with this slug already exists' },
        { status: 400 }
      );
    }

    const [category] = await db
      .insert(forumCategories)
      .values({
        name,
        slug,
        description: description || null,
        icon: icon || '💬',
        color: color || null,
        order: order || 0,
        minRole: minRole || 'user',
        isPrivate: isPrivate || false,
      })
      .returning();

    return NextResponse.json({ success: true, category });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    console.error('Error creating forum category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
