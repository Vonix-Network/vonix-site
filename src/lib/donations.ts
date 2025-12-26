/**
 * Unified Donation Processing
 * 
 * Single source of truth for processing donations from any payment provider.
 * Handles: user lookup, rank updates, donation records, Discord notifications, admin alerts.
 */

import { db } from '@/db';
import { users, donations, donationRanks } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { sendAdminDonationAlert } from '@/lib/email';

export type PaymentMethod = 'stripe' | 'kofi' | 'square';
export type PaymentType = 'one_time' | 'subscription' | 'subscription_renewal';

export interface DonationData {
    // User identification (at least one should be provided for non-guest)
    userId?: number;
    email?: string;
    minecraftUsername?: string;
    guestName?: string; // For guest donations

    // Payment details
    amount: number;
    currency: string;
    method: PaymentMethod;
    paymentType: PaymentType;
    transactionId: string;

    // Rank info (for Stripe/Square, this is known from checkout)
    rankId?: string | null;
    days?: number; // Duration in days

    // Optional metadata
    subscriptionId?: string;
    receiptUrl?: string;
    message?: string;
    invoiceId?: string;
    invoiceUrl?: string;
    priceId?: string;
}

export interface DonationResult {
    success: boolean;
    donationId?: number;
    userId?: number;
    rankAssigned?: string;
    error?: string;
}

/**
 * Find the best matching rank for a given donation amount.
 * Used primarily for Ko-Fi where the rank isn't pre-selected.
 */
export async function findBestRankForAmount(amount: number): Promise<{
    id: string;
    name: string;
    minAmount: number;
} | null> {
    // Get all donation ranks, sorted by minAmount descending
    const ranks = await db
        .select({
            id: donationRanks.id,
            name: donationRanks.name,
            minAmount: donationRanks.minAmount,
        })
        .from(donationRanks)
        .orderBy(desc(donationRanks.minAmount));

    // Find the highest rank the donation can afford
    for (const rank of ranks) {
        if (amount >= rank.minAmount) {
            return {
                id: rank.id,
                name: rank.name,
                minAmount: rank.minAmount,
            };
        }
    }

    return null;
}

/**
 * Process a donation from any payment provider.
 * This is the single entry point for all donation processing.
 */
export async function processDonation(data: DonationData): Promise<DonationResult> {
    console.log(`Processing ${data.method} ${data.paymentType} donation: $${data.amount} (tx: ${data.transactionId})`);

    try {
        // Check for duplicate transaction
        const [existingDonation] = await db
            .select({ id: donations.id })
            .from(donations)
            .where(eq(donations.paymentId, data.transactionId))
            .limit(1);

        if (existingDonation) {
            console.log(`Donation already processed: ${data.transactionId}`);
            return { success: true, donationId: existingDonation.id };
        }

        // Find or identify user
        let user: typeof users.$inferSelect | undefined;
        let resolvedUserId: number | undefined;
        const isGuest = !data.userId && !data.email && !data.minecraftUsername;

        if (data.userId) {
            const [foundUser] = await db
                .select()
                .from(users)
                .where(eq(users.id, data.userId))
                .limit(1);
            user = foundUser;
            resolvedUserId = foundUser?.id;
        } else if (data.email) {
            const [foundUser] = await db
                .select()
                .from(users)
                .where(eq(users.email, data.email))
                .limit(1);
            user = foundUser;
            resolvedUserId = foundUser?.id;
        } else if (data.minecraftUsername) {
            const [foundUser] = await db
                .select()
                .from(users)
                .where(eq(users.minecraftUsername, data.minecraftUsername))
                .limit(1);
            user = foundUser;
            resolvedUserId = foundUser?.id;
        }

        // Determine rank and days if not provided (Ko-Fi case)
        let rankId = data.rankId;
        let days = data.days || 0;

        if (!rankId && data.method === 'kofi') {
            const matchedRank = await findBestRankForAmount(data.amount);
            if (matchedRank) {
                rankId = matchedRank.id;
                // Calculate proportional days based on amount
                if (matchedRank.minAmount > 0) {
                    days = Math.floor((data.amount / matchedRank.minAmount) * 30);
                    days = Math.max(days, 7); // Minimum 7 days
                    days = Math.min(days, 365); // Maximum 1 year
                } else {
                    days = 30;
                }
                console.log(`Ko-Fi amount-matched rank: ${matchedRank.name} for ${days} days`);
            }
        }

        // Get rank name for notifications
        let rankName: string | null = null;
        if (rankId) {
            const [rank] = await db
                .select({ name: donationRanks.name })
                .from(donationRanks)
                .where(eq(donationRanks.id, rankId))
                .limit(1);
            rankName = rank?.name || null;
        }

        // Update user's rank and total donated if user found
        if (user && resolvedUserId) {
            if (rankId && days > 0) {
                // Rank purchase - extend or set new rank
                const now = new Date();
                let expiresAt: Date;
                const oldRankId = user.donationRankId;

                if (user.donationRankId === rankId && user.rankExpiresAt && new Date(user.rankExpiresAt) > now) {
                    // Extend existing rank
                    const currentExpiry = new Date(user.rankExpiresAt);
                    expiresAt = new Date(currentExpiry);
                    expiresAt.setDate(currentExpiry.getDate() + days);
                    console.log(`Extending existing rank ${rankId} by ${days} days`);
                } else {
                    // New rank assignment
                    expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + days);
                    console.log(`Assigning new rank ${rankId} for ${days} days`);
                }

                // Set subscription status for recurring payments
                const subscriptionStatus = data.paymentType === 'subscription' || data.paymentType === 'subscription_renewal'
                    ? 'active' as const
                    : user.subscriptionStatus;

                await db
                    .update(users)
                    .set({
                        donationRankId: rankId,
                        rankExpiresAt: expiresAt,
                        totalDonated: (user.totalDonated || 0) + data.amount,
                        subscriptionStatus,
                        updatedAt: new Date(),
                    })
                    .where(eq(users.id, resolvedUserId));

                console.log(`✅ Rank ${rankId} applied to user ${resolvedUserId} (expires: ${expiresAt.toISOString()})`);

                // Update Discord role if user has linked Discord account
                if (oldRankId !== rankId) {
                    try {
                        const { updateUserDiscordRole } = await import('@/lib/discord-integration');
                        await updateUserDiscordRole(resolvedUserId, rankId, oldRankId);
                        console.log(`✅ Updated Discord role for user ${resolvedUserId}`);
                    } catch (discordError: any) {
                        console.error('Failed to update Discord role:', discordError);
                        // Continue even if Discord role update fails
                    }
                }
            } else {
                // Pure tip - just update total
                await db
                    .update(users)
                    .set({
                        totalDonated: (user.totalDonated || 0) + data.amount,
                        updatedAt: new Date(),
                    })
                    .where(eq(users.id, resolvedUserId));

                console.log(`✅ Tip of $${data.amount} recorded for user ${resolvedUserId}`);
            }
        }

        // Create donation record
        const [donation] = await db.insert(donations).values({
            userId: resolvedUserId || null,
            amount: data.amount,
            currency: data.currency.toUpperCase(),
            status: 'completed',
            paymentId: data.transactionId,
            rankId: rankId || null,
            days: days > 0 ? days : null,
            paymentType: data.paymentType,
            minecraftUsername: data.minecraftUsername || user?.minecraftUsername || null,
            minecraftUuid: user?.minecraftUuid || null,
            stripeInvoiceId: data.invoiceId || null,
            stripeInvoiceUrl: data.invoiceUrl || null,
            stripePriceId: data.priceId || null,
            createdAt: new Date(),
        }).returning({ id: donations.id });

        // Get donor display name
        const donorName = isGuest
            ? (data.guestName || 'Anonymous')
            : (user?.minecraftUsername || user?.username || 'Unknown');

        // Send Discord notification
        try {
            const { sendDonationDiscordNotification } = await import('@/lib/discord-notifications');
            await sendDonationDiscordNotification({
                username: donorName,
                minecraftUsername: data.minecraftUsername || user?.minecraftUsername || undefined,
                amount: data.amount,
                currency: data.currency.toUpperCase(),
                paymentType: data.paymentType,
                rankName,
                days: days > 0 ? days : null,
                message: data.message || (isGuest ? `Guest donation from ${data.guestName}` : null),
            });
            console.log('✅ Sent Discord donation notification');
        } catch (discordError: any) {
            console.error('Failed to send Discord notification:', discordError);
        }

        // Send admin email alert
        try {
            await sendAdminDonationAlert(
                donorName,
                data.amount,
                rankName || undefined
            );
            console.log('✅ Sent admin donation alert email');
        } catch (emailError: any) {
            console.error('Failed to send donation alert email:', emailError);
        }

        return {
            success: true,
            donationId: donation.id,
            userId: resolvedUserId,
            rankAssigned: rankName || undefined,
        };
    } catch (error: any) {
        console.error('Error processing donation:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
