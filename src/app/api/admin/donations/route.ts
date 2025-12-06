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
    const type = searchParams.get('type');

    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(users.username, `%${search}%`),
          like(users.minecraftUsername, `%${search}%`),
          like(donations.stripePaymentIntentId, `%${search}%`)
        )
      );
    }

    if (status) {
      conditions.push(eq(donations.status, status));
    }

    if (type) {
      conditions.push(eq(donations.type, type as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get donations with user and rank info
    const donationsList = await db
      .select({
        id: donations.id,
        userId: donations.userId,
        username: users.username,
        avatar: users.avatar,
        minecraftUsername: users.minecraftUsername, // Use user's MC username as fallback or main source
        amount: donations.amount,
        currency: donations.currency,
        message: donations.metadata, // Assuming metadata might contain message
        stripePaymentIntentId: donations.stripePaymentIntentId,
        itemId: donations.itemId,
        type: donations.type,
        status: donations.status,
        createdAt: donations.createdAt,
        // Rank info if applicable
        rankName: donationRanks.name,
        rankColor: donationRanks.color,
      })
      .from(donations)
      .leftJoin(users, eq(donations.userId, users.id))
      .leftJoin(donationRanks, eq(donations.itemId, donationRanks.id))
      .where(whereClause)
      .orderBy(desc(donations.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(donations)
      .leftJoin(users, eq(donations.userId, users.id)) // Join needed for search filters
      .where(whereClause);

    // Get stats
    const [stats] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${donations.amount}), 0)`,
        completed: sql<number>`SUM(CASE WHEN ${donations.status} = 'succeeded' THEN ${donations.amount} ELSE 0 END)`,
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
      amount,
      currency = 'USD',
      message,
      rankId, // This maps to itemId
      type = 'one_time',
      status = 'succeeded',
      userId,
      createdAt,
    } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Amount is required and must be positive' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Determine the creation date
    const donationDate = createdAt ? new Date(createdAt) : new Date();

    const [newDonation] = await db
      .insert(donations)
      .values({
        userId,
        amount,
        currency,
        status,
        type,
        itemId: rankId || null,
        metadata: message ? JSON.stringify({ message }) : null,
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
