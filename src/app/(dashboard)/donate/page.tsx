import { db } from '@/db';
import { donationRanks, donations, users } from '@/db/schema';
import { desc, sql, eq } from 'drizzle-orm';
import { DonatePageClient } from './donate-client';
import { auth } from '../../../../auth';

export const dynamic = 'force-dynamic';

async function getRanks() {
  try {
    // Ordering by priceMonth or weight if available. Using priceMonth for now.
    const ranks = await db.select().from(donationRanks).orderBy(donationRanks.priceMonth);
    return ranks.map(r => ({
      id: r.id,
      name: r.name,
      minAmount: r.priceMonth ? r.priceMonth / 100 : 0, // Converting cents to dollars for minAmount equivalent
      color: r.color || '#00D9FF',
      icon: '⭐', // Default icon as it's missing from schema
      perks: typeof r.features === 'string' ? JSON.parse(r.features) : (r.features || []), // Mapping features to perks
    }));
  } catch {
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
        type: donations.type,
        itemId: donations.itemId,
        username: users.username,
        minecraftUsername: users.minecraftUsername,
      })
      .from(donations)
      .leftJoin(users, eq(donations.userId, users.id))
      .where(eq(donations.status, 'succeeded')) // Assuming 'succeeded' is the correct status
      .orderBy(desc(donations.createdAt))
      .limit(10);

    return result.map(d => ({
      id: d.id,
      minecraftUsername: d.minecraftUsername || d.username || 'Anonymous',
      amount: d.amount,
      message: d.type === 'rank' ? `Rank Upgrade: ${d.itemId}` : 'Donation',
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
      .where(eq(donations.status, 'succeeded'));
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
    let rank = null;
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
