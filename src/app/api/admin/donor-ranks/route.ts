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
      .orderBy(asc(donationRanks.minAmount));

    return NextResponse.json(ranks, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  } catch (error: any) {
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
      id, name, subtitle, minAmount, color, textColor,
      icon, badge, glow, duration, perks, stripePriceMonthly
    } = body;

    if (!id || !name || minAmount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, minAmount' },
        { status: 400 }
      );
    }

    const [rank] = await db
      .insert(donationRanks)
      .values({
        id,
        name,
        subtitle: subtitle || null,
        minAmount: minAmount || 0,
        color: color || '#00D9FF',
        textColor: textColor || '#FFFFFF',
        icon: icon || null,
        badge: badge || null,
        glow: glow || false,
        duration: duration || 30,
        perks: perks ? JSON.stringify(perks) : null,
        stripePriceMonthly: stripePriceMonthly || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ success: true, rank });
  } catch (error: any) {
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
      id, name, subtitle, minAmount, color, textColor,
      icon, badge, glow, duration, perks, stripePriceMonthly
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
        subtitle,
        minAmount,
        color,
        textColor,
        icon,
        badge,
        glow,
        duration,
        perks: perks ? JSON.stringify(perks) : undefined,
        stripePriceMonthly,
        updatedAt: new Date(),
      })
      .where(eq(donationRanks.id, id))
      .returning();

    return NextResponse.json({ success: true, rank });
  } catch (error: any) {
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
  } catch (error: any) {
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
