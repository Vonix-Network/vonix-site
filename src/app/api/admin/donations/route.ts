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
          like(donations.paymentId as any, `%${search}%`)
        )
      );
    }

    if (status) {
      conditions.push(eq(donations.status, status as 'completed' | 'pending' | 'failed' | 'refunded'));
    }

    if (type) {
      conditions.push(eq(donations.paymentType, type as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get donations with user and rank info
    const donationsList = await db
      .select({
        id: donations.id,
        userId: donations.userId,
        username: users.username,
        avatar: users.avatar,
        minecraftUsername: sql<string>`COALESCE(${donations.minecraftUsername}, ${users.minecraftUsername})`,
        amount: donations.amount,
        currency: donations.currency,
        method: donations.method,
        message: donations.message,
        displayed: donations.displayed,
        receiptNumber: donations.receiptNumber,
        paymentId: donations.paymentId,
        subscriptionId: donations.subscriptionId,
        rankId: donations.rankId,
        days: donations.days,
        paymentType: donations.paymentType,
        status: donations.status,
        stripeInvoiceUrl: donations.stripeInvoiceUrl,
        createdAt: donations.createdAt,
        // Rank info if applicable
        rankName: donationRanks.name,
        rankColor: donationRanks.color,
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
      .leftJoin(users, eq(donations.userId, users.id)) // Join needed for search filters
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
      amount,
      currency = 'USD',
      message,
      rankId,
      paymentType = 'one_time',
      status = 'completed',
      userId: providedUserId,
      minecraftUsername,
      days,
      createdAt,
    } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Amount is required and must be positive' }, { status: 400 });
    }

    // Look up user - either by userId or minecraftUsername
    let resolvedUserId: number | null = null;
    let user = null;

    if (providedUserId) {
      // Direct userId provided
      resolvedUserId = parseInt(providedUserId);
      const [foundUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, resolvedUserId))
        .limit(1);
      user = foundUser;
    } else if (minecraftUsername) {
      // Look up by Minecraft username
      const [foundUser] = await db
        .select()
        .from(users)
        .where(or(
          eq(users.minecraftUsername, minecraftUsername),
          eq(users.username, minecraftUsername)
        ))
        .limit(1);

      if (foundUser) {
        user = foundUser;
        resolvedUserId = foundUser.id;
      }
    }

    if (!resolvedUserId) {
      return NextResponse.json({
        error: 'User not found. Please provide a valid User ID or Minecraft Username.'
      }, { status: 400 });
    }

    // Determine the creation date
    const donationDate = createdAt ? new Date(createdAt) : new Date();
    const daysNum = days ? parseInt(days) : null;

    // Create the donation record
    const [newDonation] = await db
      .insert(donations)
      .values({
        userId: resolvedUserId,
        amount,
        currency,
        status,
        paymentType,
        rankId: rankId || null,
        days: daysNum,
        message: message || null,
        createdAt: donationDate,
      })
      .returning();

    // If a rank and days are specified along with a completed status, apply the rank to the user
    if (rankId && daysNum && daysNum > 0 && status === 'completed' && user) {
      const now = new Date();
      let expiresAt: Date;

      // Check if user already has this rank with remaining time
      if (user.donationRankId === rankId && user.rankExpiresAt) {
        const currentExpiry = new Date(user.rankExpiresAt);
        if (currentExpiry > now) {
          // Add days to existing expiration
          expiresAt = new Date(currentExpiry);
          expiresAt.setDate(currentExpiry.getDate() + daysNum);
        } else {
          // Expired, start from now
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + daysNum);
        }
      } else {
        // New rank or different rank
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + daysNum);
      }

      // Update user's rank
      await db
        .update(users)
        .set({
          donationRankId: rankId,
          rankExpiresAt: expiresAt,
          totalDonated: (user.totalDonated || 0) + amount,
          updatedAt: new Date(),
        })
        .where(eq(users.id, resolvedUserId));

      console.log(`✅ Manual donation: Assigned rank ${rankId} to user ${resolvedUserId} for ${daysNum} days (expires: ${expiresAt.toISOString()})`);
    } else if (status === 'completed' && user) {
      // Just update total donated for donations without ranks
      await db
        .update(users)
        .set({
          totalDonated: (user.totalDonated || 0) + amount,
          updatedAt: new Date(),
        })
        .where(eq(users.id, resolvedUserId));
    }

    return NextResponse.json({ success: true, donation: newDonation }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    console.error('Error creating donation:', error);
    return NextResponse.json({ error: 'Failed to create donation' }, { status: 500 });
  }
}

