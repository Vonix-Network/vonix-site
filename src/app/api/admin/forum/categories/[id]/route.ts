import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { forumCategories } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Helper to check admin
async function requireAdmin() {
  const session = await auth();
  const user = session?.user as any;

  if (!session || !['admin', 'superadmin', 'moderator'].includes(user?.role)) {
    throw new Error('Unauthorized');
  }

  return user;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const categoryId = parseInt(id);

    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, slug, description, icon, color, order, minRole, isPrivate } = body;

    // Check if category exists
    const [existing] = await db
      .select()
      .from(forumCategories)
      .where(eq(forumCategories.id, categoryId));

    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // If slug is being changed, check for duplicates
    if (slug && slug !== existing.slug) {
      const duplicateSlug = await db
        .select()
        .from(forumCategories)
        .where(eq(forumCategories.slug, slug))
        .limit(1);

      if (duplicateSlug.length > 0) {
        return NextResponse.json(
          { error: 'A category with this slug already exists' },
          { status: 400 }
        );
      }
    }

    const [category] = await db
      .update(forumCategories)
      .set({
        name: name || existing.name,
        slug: slug || existing.slug,
        description: description !== undefined ? description : existing.description,
        icon: icon || existing.icon,
        color: color !== undefined ? color : existing.color,
        order: order !== undefined ? order : existing.order,
        minRole: minRole || existing.minRole,
        isPrivate: isPrivate !== undefined ? isPrivate : existing.isPrivate,
        updatedAt: new Date(),
      })
      .where(eq(forumCategories.id, categoryId))
      .returning();

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    console.error('Error updating forum category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const categoryId = parseInt(id);

    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
    }

    // Delete the category (cascade will handle posts)
    await db.delete(forumCategories).where(eq(forumCategories.id, categoryId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    console.error('Error deleting forum category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
