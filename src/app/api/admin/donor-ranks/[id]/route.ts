import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { donationRanks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth-guard';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get single rank
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { error } = await requirePermission('ranks:manage');
    if (error) return error;

    const { id } = await params;

    const [rank] = await db
      .select()
      .from(donationRanks)
      .where(eq(donationRanks.id, id));

    if (!rank) {
      return NextResponse.json({ error: 'Rank not found' }, { status: 404 });
    }

    return NextResponse.json(rank);
  } catch (error) {
    console.error('Error fetching rank:', error);
    return NextResponse.json({ error: 'Failed to fetch rank' }, { status: 500 });
  }
}

// PUT - Update rank
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { error } = await requirePermission('ranks:manage');
    if (error) return error;

    const { id } = await params;
    const body = await request.json();

    const {
      name,
      subtitle,
      minAmount,
      color,
      textColor,
      icon,
      badge,
      glow,
      duration,
      perks,
      stripePriceMonthly
    } = body;

    const [updated] = await db
      .update(donationRanks)
      .set({
        name,
        subtitle,
        minAmount,
        color,
        textColor,
        icon,
        badge,
        glow,
        duration,
        perks: typeof perks === 'string' ? perks : JSON.stringify(perks),
        stripePriceMonthly,
        updatedAt: new Date(),
      })
      .where(eq(donationRanks.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Rank not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating rank:', error);
    return NextResponse.json({ error: 'Failed to update rank' }, { status: 500 });
  }
}

// DELETE - Delete rank
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { error } = await requirePermission('ranks:manage');
    if (error) return error;

    const { id } = await params;

    const [deleted] = await db
      .delete(donationRanks)
      .where(eq(donationRanks.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Rank not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting rank:', error);
    return NextResponse.json({ error: 'Failed to delete rank' }, { status: 500 });
  }
}
