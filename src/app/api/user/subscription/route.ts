import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { users, donationRanks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSubscription, isStripeConfiguredSync } from '@/lib/stripe';

/**
 * GET /api/user/subscription
 * Returns the current user's subscription status and rank information
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Please log in' },
        { status: 401 }
      );
    }

    const sessionUser = session.user as any;
    const userId = parseInt(sessionUser.id);

    // Get user from database
    const [user] = await db
      .select({
        id: users.id,
        donationRankId: users.donationRankId,
        rankExpiresAt: users.rankExpiresAt,
        stripeSubscriptionId: users.stripeSubscriptionId,
        subscriptionStatus: users.subscriptionStatus,
        totalDonated: users.totalDonated,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get rank details if user has a rank
    let rank = null;
    if (user.donationRankId) {
      const [foundRank] = await db
        .select()
        .from(donationRanks)
        .where(eq(donationRanks.id, user.donationRankId))
        .limit(1);
      rank = foundRank;
    }

    // Get subscription status from Stripe if available
    let stripeSubscription = null;
    if (user.stripeSubscriptionId && isStripeConfiguredSync()) {
      try {
        stripeSubscription = await getSubscription(user.stripeSubscriptionId);
      } catch (err) {
        console.error('Error fetching Stripe subscription:', err);
      }
    }

    return NextResponse.json({
      hasRank: !!user.donationRankId,
      rank: rank ? {
        id: rank.id,
        name: rank.name,
        color: rank.color,
        weight: rank.weight,
      } : null,
      expiresAt: user.rankExpiresAt?.toISOString() || null,
      isExpired: user.rankExpiresAt ? new Date(user.rankExpiresAt) < new Date() : true,
      hasSubscription: !!user.stripeSubscriptionId,
      subscriptionStatus: user.subscriptionStatus,
      totalDonated: user.totalDonated || 0,
      stripeStatus: stripeSubscription?.status || null,
      cancelAtPeriodEnd: stripeSubscription?.cancel_at_period_end || false,
      currentPeriodEnd: stripeSubscription
        ? new Date((stripeSubscription as any).current_period_end * 1000).toISOString()
        : null,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription data' },
      { status: 500 }
    );
  }
}

