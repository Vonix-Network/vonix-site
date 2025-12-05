import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { donations, users, donationRanks } from '@/db/schema';
import { eq, desc, and, like, or, sql } from 'drizzle-orm';

async function requireAdmin() {
  const session = await auth();
  const user = session?.user as any;

  if (!session || !['admin', 'superadmin'].includes(user?.role)) {
    throw new Error('Unauthorized');
  }

  return user;
}

// GET - List donations with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const paymentType = searchParams.get('paymentType');

    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          like(donations.minecraftUsername, `%${search}%`),
          like(donations.receiptNumber, `%${search}%`),
          like(donations.paymentId, `%${search}%`)
        )
      );
    }
    
    if (status) {
      conditions.push(eq(donations.status, status as any));
    }
    
    if (paymentType) {
      conditions.push(eq(donations.paymentType, paymentType as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get donations with user and rank info
    const donationsList = await db
      .select({
        id: donations.id,
        userId: donations.userId,
        username: users.username,
        avatar: users.avatar,
        minecraftUsername: donations.minecraftUsername,
        amount: donations.amount,
        currency: donations.currency,
        method: donations.method,
        message: donations.message,
        displayed: donations.displayed,
        receiptNumber: donations.receiptNumber,
        paymentId: donations.paymentId,
        subscriptionId: donations.subscriptionId,
        rankId: donations.rankId,
        rankName: donationRanks.name,
        rankColor: donationRanks.color,
        days: donations.days,
        paymentType: donations.paymentType,
        status: donations.status,
        stripeInvoiceUrl: donations.stripeInvoiceUrl,
        createdAt: donations.createdAt,
      })
      .from(donations)
      .leftJoin(users, eq(donations.userId, users.id))
      .leftJoin(donationRanks, eq(donations.rankId, donationRanks.id))
      .where(whereClause)
      .orderBy(desc(donations.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(donations)
      .where(whereClause);

    // Get stats
    const [stats] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${donations.amount}), 0)`,
        completed: sql<number>`SUM(CASE WHEN ${donations.status} = 'completed' THEN ${donations.amount} ELSE 0 END)`,
        refunded: sql<number>`SUM(CASE WHEN ${donations.status} = 'refunded' THEN ${donations.amount} ELSE 0 END)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(donations);

    return NextResponse.json({
      donations: donationsList,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
      stats: {
        totalRevenue: stats?.total || 0,
        completedRevenue: stats?.completed || 0,
        refundedAmount: stats?.refunded || 0,
        totalDonations: stats?.count || 0,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    console.error('Error fetching donations:', error);
    return NextResponse.json({ error: 'Failed to fetch donations' }, { status: 500 });
  }
}

// POST - Create a manual donation
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const {
      minecraftUsername,
      amount,
      currency = 'USD',
      message,
      displayed = true,
      rankId,
      days,
      paymentType = 'one_time',
      status = 'completed',
      createdAt, // Optional: if not provided, use now
    } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Amount is required and must be positive' }, { status: 400 });
    }

    // Generate receipt number
    const receiptNumber = `VN-MANUAL-${Date.now()}`;

    // Determine the creation date
    const donationDate = createdAt ? new Date(createdAt) : new Date();

    const [newDonation] = await db
      .insert(donations)
      .values({
        minecraftUsername: minecraftUsername || null,
        amount,
        currency,
        method: 'manual',
        message: message || null,
        displayed,
        receiptNumber,
        rankId: rankId || null,
        days: days || null,
        paymentType,
        status,
        createdAt: donationDate,
      })
      .returning();

    return NextResponse.json({ success: true, donation: newDonation }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    console.error('Error creating donation:', error);
    return NextResponse.json({ error: 'Failed to create donation' }, { status: 500 });
  }
}

