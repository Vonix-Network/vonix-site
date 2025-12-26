import { db } from '@/db';
import { donationRanks, donations, users } from '@/db/schema';
import { desc, sql, eq } from 'drizzle-orm';
import { DonatePageClient } from './donate-client';
import { auth } from '../../../../auth';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Store & Donations',
  description: 'Support Vonix Network and unlock exclusive ranks, perks, and cosmetics. Secure payments via Stripe.',
  openGraph: {
    title: 'Store & Donations | Vonix Network',
    description: 'Support the server and get exclusive rewards!',
  },
};

export const dynamic = 'force-dynamic';

async function getRanks() {
  try {
    // Ordering by minAmount - auto-orders by price
    const ranks = await db.select().from(donationRanks).orderBy(donationRanks.minAmount);
    return ranks.map((r: any) => {
      // Safely parse perks - handle already-parsed or malformed data
      let perks: string[] = [];
      try {
        if (typeof r.perks === 'string' && r.perks) {
          perks = JSON.parse(r.perks);
        } else if (Array.isArray(r.perks)) {
          perks = r.perks;
        }
      } catch {
        perks = [];
      }

      return {
        id: r.id,
        name: r.name,
        minAmount: r.minAmount || 0,
        color: r.color || '#00D9FF',
        icon: r.icon || '⭐',
        perks,
        stripeProductId: r.stripeProductId,
        stripePriceMonthly: r.stripePriceMonthly,
      };
    });
  } catch (error: any) {
    console.error('Error fetching ranks:', error);
    return [];
  }
}

async function getRecentDonations() {
  try {
    const result = await db
      .select({
        id: donations.id,
        amount: donations.amount,
        createdAt: donations.createdAt,
        paymentType: donations.paymentType,
        rankId: donations.rankId,
        username: users.username,
        minecraftUsername: users.minecraftUsername,
      })
      .from(donations)
      .leftJoin(users, eq(donations.userId, users.id))
      .where(eq(donations.status, 'completed'))
      .orderBy(desc(donations.createdAt))
      .limit(10);

    return result.map((d: any) => ({
      id: d.id,
      minecraftUsername: d.minecraftUsername || d.username || 'Anonymous',
      amount: d.amount,
      message: d.paymentType === 'subscription' ? `Subscription: ${d.rankId || 'Rank'}` : 'One-time',
      createdAt: d.createdAt?.toISOString() || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

async function getDonationStats() {
  try {
    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(${donations.amount}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(donations)
      .where(eq(donations.status, 'completed'));
    return result[0] || { total: 0, count: 0 };
  } catch {
    return { total: 0, count: 0 };
  }
}

async function getUserSubscription() {
  try {
    const session = await auth();
    if (!session?.user) return null;

    const userId = parseInt((session.user as any).id);
    const [user] = await db
      .select({
        donationRankId: users.donationRankId,
        rankExpiresAt: users.rankExpiresAt,
        stripeSubscriptionId: users.stripeSubscriptionId,
        subscriptionStatus: users.subscriptionStatus,
        totalDonated: users.totalDonated,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return null;

    // Get rank details if user has a rank
    let rank: any = null;
    if (user.donationRankId) {
      const [foundRank] = await db
        .select()
        .from(donationRanks)
        .where(eq(donationRanks.id, user.donationRankId))
        .limit(1);
      rank = foundRank ? {
        id: foundRank.id,
        name: foundRank.name,
        color: foundRank.color,
        icon: '⭐', // Default icon
      } : null;
    }

    return {
      hasRank: !!user.donationRankId,
      rank,
      expiresAt: user.rankExpiresAt?.toISOString() || null,
      isExpired: user.rankExpiresAt ? new Date(user.rankExpiresAt) < new Date() : true,
      hasSubscription: !!user.stripeSubscriptionId,
      subscriptionStatus: user.subscriptionStatus,
      totalDonated: user.totalDonated || 0,
    };
  } catch {
    return null;
  }
}

export default async function DonatePage() {
  const [ranks, recentDonations, stats, userSubscription] = await Promise.all([
    getRanks(),
    getRecentDonations(),
    getDonationStats(),
    getUserSubscription(),
  ]);

  return (
    <DonatePageClient
      ranks={ranks}
      recentDonations={recentDonations}
      stats={stats}
      userSubscription={userSubscription}
    />
  );
}

