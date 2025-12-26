/**
 * Rank Utilities
 * Helper functions for fetching and working with user ranks
 */

import { db } from '@/db';
import { users, donationRanks, type DonationRank } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Export type from schema to avoid duplication and mismatches
export type { DonationRank };

export interface UserWithRank {
  id: number;
  username: string;
  role: string;
  donationRankId: string | null;
  rankExpiresAt: Date | null;
  rank?: DonationRank | null;
}

/**
 * Get user's donation rank
 */
export async function getUserRank(userId: number): Promise<DonationRank | null> {
  try {
    const [user] = await db
      .select({
        donationRankId: users.donationRankId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.donationRankId) {
      return null;
    }

    const [rank] = await db
      .select()
      .from(donationRanks)
      .where(eq(donationRanks.id, user.donationRankId))
      .limit(1);

    return rank || null;
  } catch (error: any) {
    console.error('Error fetching user rank:', error);
    return null;
  }
}

/**
 * Get rank by ID
 */
export async function getRankById(rankId: string): Promise<DonationRank | null> {
  try {
    const [rank] = await db
      .select()
      .from(donationRanks)
      .where(eq(donationRanks.id, rankId))
      .limit(1);

    return rank || null;
  } catch (error: any) {
    console.error('Error fetching rank:', error);
    return null;
  }
}

/**
 * Get all ranks
 */
export async function getAllRanks(): Promise<DonationRank[]> {
  try {
    return await db.select().from(donationRanks);
  } catch (error: any) {
    console.error('Error fetching ranks:', error);
    return [];
  }
}

/**
 * Check if user's rank is active (not expired)
 */
export function isRankActive(rankExpiresAt: Date | null): boolean {
  if (!rankExpiresAt) return false;
  return new Date(rankExpiresAt) > new Date();
}

/**
 * Get rank display name with formatting
 */
export function getRankDisplayName(rank: DonationRank): string {
  return rank.name;
}

/**
 * Get rank status for user
 */
export async function getUserRankStatus(userId: number): Promise<{
  hasRank: boolean;
  rank: DonationRank | null;
  expiresAt: Date | null;
  isActive: boolean;
  daysRemaining: number;
}> {
  try {
    const [user] = await db
      .select({
        donationRankId: users.donationRankId,
        rankExpiresAt: users.rankExpiresAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.donationRankId) {
      return {
        hasRank: false,
        rank: null,
        expiresAt: null,
        isActive: false,
        daysRemaining: 0,
      };
    }

    const rank = await getRankById(user.donationRankId);
    const expiresAt = user.rankExpiresAt;
    const isActive = isRankActive(expiresAt);

    let daysRemaining = 0;
    if (expiresAt && isActive) {
      const now = new Date();
      const expiry = new Date(expiresAt);
      daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      hasRank: !!rank && isActive,
      rank: isActive ? rank : null,
      expiresAt,
      isActive,
      daysRemaining,
    };
  } catch (error: any) {
    console.error('Error getting user rank status:', error);
    return {
      hasRank: false,
      rank: null,
      expiresAt: null,
      isActive: false,
      daysRemaining: 0,
    };
  }
}

/**
 * Format rank expiration time
 */
export function formatRankExpiration(expiresAt: Date | null): string {
  if (!expiresAt) return 'Never';

  const now = new Date();
  const expiry = new Date(expiresAt);

  if (expiry <= now) return 'Expired';

  const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (days === 1) return '1 day remaining';
  if (days < 7) return `${days} days remaining`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? '1 week remaining' : `${weeks} weeks remaining`;
  }

  const months = Math.floor(days / 30);
  return months === 1 ? '1 month remaining' : `${months} months remaining`;
}

