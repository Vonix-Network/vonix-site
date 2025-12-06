/**
 * Rank Subscription Service
 * 
 * Enterprise-grade rank management with time-based subscriptions,
 * automatic expiration, upgrades/downgrades with day conversion
 */

import { db } from '@/db';
import { users, donationRanks } from '@/db/schema';
import { eq, lt, and, isNotNull } from 'drizzle-orm';
import { convertRankDays } from './rank-pricing';

// Re-export pricing functions from client-safe module
export {
  DEFAULT_RANK_PRICING,
  calculateDaysForPrice,
  calculatePriceForDays,
  getDurationPackages,
  convertRankDays,
  getRankValueInfo,
} from './rank-pricing';

export interface SubscriptionPlan {
  rankId: string;
  rankName: string;
  pricePerDay: number;
  features: string[];
  color: string;
  badge: string;
}

export interface RankValue {
  rankId: string;
  pricePerDay: number;
}

/**
 * Assign rank subscription to user
 */
export async function assignRankSubscription(
  userId: number,
  rankId: string,
  days: number
): Promise<{ success: boolean; expiresAt?: Date; error?: string }> {
  try {
    // Get current user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Calculate new expiration date
    const now = new Date();
    let expiresAt = new Date();
    expiresAt.setDate(now.getDate() + days);

    // If user already has this rank with time remaining, add to it
    if (user.donationRankId === rankId && user.rankExpiresAt) {
      const currentExpiry = new Date(user.rankExpiresAt);
      if (currentExpiry > now) {
        // Add days to existing expiration
        expiresAt = new Date(currentExpiry);
        expiresAt.setDate(currentExpiry.getDate() + days);
      }
    }

    // Update user
    await db
      .update(users)
      .set({
        donationRankId: rankId,
        rankExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    console.log(`✅ Assigned rank ${rankId} to user ${userId} for ${days} days (expires: ${expiresAt.toISOString()})`);

    return { success: true, expiresAt };
  } catch (error) {
    console.error('Error assigning rank subscription:', error);
    return { success: false, error: 'Failed to assign rank' };
  }
}

/**
 * Upgrade user rank (converts remaining days)
 */
export async function upgradeRank(
  userId: number,
  newRankId: string
): Promise<{ success: boolean; expiresAt?: Date; error?: string }> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const now = new Date();
    
    // Calculate remaining days in current rank
    let convertedDays = 0;
    if (user.donationRankId && user.rankExpiresAt) {
      const currentExpiry = new Date(user.rankExpiresAt);
      if (currentExpiry > now) {
        const remainingDays = Math.ceil((currentExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        convertedDays = convertRankDays(user.donationRankId, newRankId, remainingDays);
      }
    }

    // Apply converted days to new rank
    const expiresAt = new Date();
    expiresAt.setDate(now.getDate() + convertedDays);

    await db
      .update(users)
      .set({
        donationRankId: newRankId,
        rankExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    console.log(`✅ Upgraded user ${userId} to rank ${newRankId} with ${convertedDays} converted days`);

    return { success: true, expiresAt };
  } catch (error) {
    console.error('Error upgrading rank:', error);
    return { success: false, error: 'Failed to upgrade rank' };
  }
}

/**
 * Downgrade user rank (converts to more days in lower tier)
 */
export async function downgradeRank(
  userId: number,
  newRankId: string
): Promise<{ success: boolean; expiresAt?: Date; error?: string }> {
  // Same logic as upgrade, conversion handles the math
  return upgradeRank(userId, newRankId);
}

/**
 * Check and remove expired ranks
 * Should be run as a cron job every hour
 */
export async function removeExpiredRanks(): Promise<{ removed: number; users: string[] }> {
  try {
    const now = new Date();
    const removedUsernames: string[] = [];
    
    // Find all users with expired ranks (rankExpiresAt < now)
    const expiredUsers = await db
      .select({
        id: users.id,
        username: users.username,
        donationRankId: users.donationRankId,
        rankExpiresAt: users.rankExpiresAt,
      })
      .from(users)
      .where(
        and(
          isNotNull(users.donationRankId),
          isNotNull(users.rankExpiresAt),
          lt(users.rankExpiresAt, now)
        )
      )
      .limit(100);

    console.log(`🔍 Found ${expiredUsers.length} users with expired ranks`);

    // Remove expired ranks
    for (const user of expiredUsers) {
      await db
        .update(users)
        .set({
          donationRankId: null,
          rankExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
      
      removedUsernames.push(user.username);
      console.log(`⏰ Removed expired rank from user ${user.username} (expired: ${user.rankExpiresAt})`);
    }

    return { removed: expiredUsers.length, users: removedUsernames };
  } catch (error) {
    console.error('Error removing expired ranks:', error);
    return { removed: 0, users: [] };
  }
}

/**
 * Get user's current rank status
 */
export async function getUserRankStatus(userId: number): Promise<{
  hasRank: boolean;
  rankId?: string;
  expiresAt?: Date;
  daysRemaining?: number;
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
      return { hasRank: false };
    }

    const now = new Date();
    const expiresAt = user.rankExpiresAt ? new Date(user.rankExpiresAt) : null;
    
    if (!expiresAt || expiresAt <= now) {
      return { hasRank: false };
    }

    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      hasRank: true,
      rankId: user.donationRankId,
      expiresAt,
      daysRemaining,
    };
  } catch (error) {
    console.error('Error getting user rank status:', error);
    return { hasRank: false };
  }
}

