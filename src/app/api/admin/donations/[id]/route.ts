import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { db } from '@/db';
import { donations, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function requireAdmin() {
  const session = await auth();
  const user = session?.user as any;

  if (!session || !['admin', 'superadmin'].includes(user?.role)) {
    throw new Error('Unauthorized');
  }

  return user;
}

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET - Get single donation
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = await params;
    const donationId = parseInt(id);

    const [donation] = await db
      .select()
      .from(donations)
      .where(eq(donations.id, donationId));

    if (!donation) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
    }

    return NextResponse.json(donation);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    console.error('Error fetching donation:', error);
    return NextResponse.json({ error: 'Failed to fetch donation' }, { status: 500 });
  }
}

// PUT - Update donation (all editable fields)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = await params;
    const donationId = parseInt(id);
    const body = await request.json();

    const {
      displayed,
      status,
      message,
      amount,
      currency,
      method,
      rankId,
      days,
      paymentType,
      minecraftUsername,
    } = body;

    const updateData: any = {};
    if (displayed !== undefined) updateData.displayed = displayed;
    if (status !== undefined) updateData.status = status;
    if (message !== undefined) updateData.message = message;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (currency !== undefined) updateData.currency = currency;
    if (method !== undefined) updateData.method = method;
    if (rankId !== undefined) updateData.rankId = rankId || null;
    if (days !== undefined) updateData.days = days ? parseInt(days) : null;
    if (paymentType !== undefined) updateData.paymentType = paymentType;
    if (minecraftUsername !== undefined) updateData.minecraftUsername = minecraftUsername || null;

    const [updated] = await db
      .update(donations)
      .set(updateData)
      .where(eq(donations.id, donationId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, donation: updated });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    console.error('Error updating donation:', error);
    return NextResponse.json({ error: 'Failed to update donation' }, { status: 500 });
  }
}

// DELETE - Delete donation record
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = await params;
    const donationId = parseInt(id);

    const [deleted] = await db
      .delete(donations)
      .where(eq(donations.id, donationId))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    console.error('Error deleting donation:', error);
    return NextResponse.json({ error: 'Failed to delete donation' }, { status: 500 });
  }
}

