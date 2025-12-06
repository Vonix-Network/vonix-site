import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { donationRanks } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

// Helper to check admin
async function requireAdmin() {
  const session = await auth();
  const user = session?.user as any;

  if (!session || !['admin', 'superadmin'].includes(user?.role)) {
    throw new Error('Unauthorized');
  }

  return user;
}

export async function GET() {
  try {
    await requireAdmin();

    const ranks = await db
      .select()
      .from(donationRanks)
      .orderBy(asc(donationRanks.priceMonth)); // Ordered by price

    return NextResponse.json(ranks, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    console.error('Error fetching donor ranks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch donor ranks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const {
      id, name, description, priceMonth, color,
      features, weight, stripePriceId, showInStore
    } = body;

    if (!id || !name || priceMonth === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, priceMonth' },
        { status: 400 }
      );
    }

    const [rank] = await db
      .insert(donationRanks)
      .values({
        id,
        name,
        description: description || null,
        priceMonth: priceMonth || 0,
        color: color || '#00D9FF',
        features: features ? JSON.stringify(features) : null,
        weight: weight || 0,
        stripePriceId: stripePriceId || null,
        showInStore: showInStore ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ success: true, rank });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    console.error('Error creating donor rank:', error);
    return NextResponse.json(
      { error: 'Failed to create donor rank' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const {
      id, name, description, priceMonth, color,
      features, weight, stripePriceId, showInStore
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Rank ID is required' },
        { status: 400 }
      );
    }

    const [rank] = await db
      .update(donationRanks)
      .set({
        name,
        description,
        priceMonth,
        color,
        features: features ? JSON.stringify(features) : undefined,
        weight,
        stripePriceId,
        showInStore,
        updatedAt: new Date(),
      })
      .where(eq(donationRanks.id, id))
      .returning();

    return NextResponse.json({ success: true, rank });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    console.error('Error updating donor rank:', error);
    return NextResponse.json(
      { error: 'Failed to update donor rank' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Rank ID is required' },
        { status: 400 }
      );
    }

    await db.delete(donationRanks).where(eq(donationRanks.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    console.error('Error deleting donor rank:', error);
    return NextResponse.json(
      { error: 'Failed to delete donor rank' },
      { status: 500 }
    );
  }
}
