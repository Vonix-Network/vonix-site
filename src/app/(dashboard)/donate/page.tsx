import { db } from '@/db';
import { donationRanks, donations } from '@/db/schema';
import { desc, sql } from 'drizzle-orm';
import { DonatePageClient } from './donate-client';

export const dynamic = 'force-dynamic';

async function getRanks() {
  try {
    const ranks = await db.select().from(donationRanks).orderBy(donationRanks.minAmount);
    return ranks.map(r => ({
      id: r.id,
      name: r.name,
      minAmount: r.minAmount,
      color: r.color || '#00D9FF',
      icon: r.icon || '⭐',
      perks: typeof r.perks === 'string' ? JSON.parse(r.perks) : (r.perks || []),
    }));
  } catch {
    return [];
  }
}

async function getRecentDonations() {
  try {
    const result = await db
      .select()
      .from(donations)
      .where(sql`${donations.displayed} = 1`)
      .orderBy(desc(donations.createdAt))
      .limit(10);
    return result.map(d => ({
      id: d.id,
      minecraftUsername: d.minecraftUsername,
      amount: d.amount,
      message: d.message,
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
      .where(sql`${donations.status} = 'completed'`);
    return result[0] || { total: 0, count: 0 };
  } catch {
    return { total: 0, count: 0 };
  }
}

export default async function DonatePage() {
  const [ranks, recentDonations, stats] = await Promise.all([
    getRanks(),
    getRecentDonations(),
    getDonationStats(),
  ]);

  return (
    <DonatePageClient
      ranks={ranks}
      recentDonations={recentDonations}
      stats={stats}
    />
  );
}
