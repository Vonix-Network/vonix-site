import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { forumCategories } from '@/db/schema';
import { asc } from 'drizzle-orm';

export async function GET() {
  try {
    const categories = await db
      .select()
      .from(forumCategories)
      .orderBy(asc(forumCategories.orderIndex));

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

