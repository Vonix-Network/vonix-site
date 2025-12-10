/**
 * Ko-Fi Webhook Handler
 * 
 * Receives donation notifications from Ko-Fi and processes them
 * similar to how Stripe donations are handled.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, donations, donationRanks } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { sendAdminDonationAlert } from '@/lib/email';
import { verifyKofiToken, getPaymentProvider } from '@/lib/kofi';

/**
 * Ko-Fi webhook payload structure
 */
interface KofiWebhookData {
    verification_token: string;
    message_id: string;
    timestamp: string;
    type: 'Donation' | 'Subscription' | 'Commission' | 'Shop Order';
    is_public: boolean;
    from_name: string;
    message: string | null;
    amount: string;
    url: string;
    email: string;
    currency: string;
    is_subscription_payment: boolean;
    is_first_subscription_payment: boolean;
    kofi_transaction_id: string;
    shop_items: Array<{
        direct_link_code: string;
        variation_name: string;
        quantity: number;
    }> | null;
    tier_name: string | null;
    shipping: {
        full_name: string;
        street_address: string;
        city: string;
        state_or_province: string;
        postal_code: string;
        country: string;
        country_code: string;
        telephone: string;
    } | null;
    discord_username: string | null;
    discord_userid: string | null;
}

/**
 * Find the best matching rank for a given donation amount
 */
async function findBestRankForAmount(amount: number): Promise<{
    id: string;
    name: string;
    minAmount: number;
} | null> {
    // Get all ranks ordered by min amount descending (highest first)
    const ranks = await db
        .select({
            id: donationRanks.id,
            name: donationRanks.name,
            minAmount: donationRanks.minAmount,
        })
        .from(donationRanks)
        .orderBy(desc(donationRanks.minAmount));

    // Find the highest rank that the donation amount qualifies for
    for (const rank of ranks) {
        if (amount >= rank.minAmount) {
            return rank;
        }
    }

    return null;
}

/**
 * POST /api/kofi/webhook
 * Handles Ko-Fi webhook events for donations
 */
export async function POST(request: NextRequest) {
    try {
        // Check if Ko-Fi is the active payment provider
        const paymentProvider = await getPaymentProvider();
        if (paymentProvider !== 'kofi') {
            console.log('Ko-Fi webhook received but payment provider is not set to Ko-Fi');
            return NextResponse.json(
                { error: 'Ko-Fi payments not enabled' },
                { status: 503 }
            );
        }

        // Ko-Fi sends data as form-urlencoded
        const formData = await request.formData();
        const dataString = formData.get('data') as string;

        if (!dataString) {
            console.error('No data field in Ko-Fi webhook');
            return NextResponse.json(
                { error: 'Invalid request: missing data field' },
                { status: 400 }
            );
        }

        // Parse the JSON data
        let data: KofiWebhookData;
        try {
            data = JSON.parse(dataString);
        } catch (e) {
            console.error('Failed to parse Ko-Fi webhook data:', e);
            return NextResponse.json(
                { error: 'Invalid JSON in data field' },
                { status: 400 }
            );
        }

        // Verify the token
        const isValid = await verifyKofiToken(data.verification_token);
        if (!isValid) {
            console.error('Invalid Ko-Fi verification token');
            return NextResponse.json(
                { error: 'Invalid verification token' },
                { status: 401 }
            );
        }

        console.log('Ko-Fi webhook received:', {
            type: data.type,
            from: data.from_name,
            amount: data.amount,
            currency: data.currency,
            transactionId: data.kofi_transaction_id,
        });

        // Only process donations (not subscriptions through Ko-Fi for now)
        if (data.type !== 'Donation') {
            console.log(`Ko-Fi webhook type ${data.type} not handled, only Donation is supported`);
            return NextResponse.json({ received: true, processed: false });
        }

        // Check for duplicate webhook (idempotency)
        const [existingDonation] = await db
            .select()
            .from(donations)
            .where(eq(donations.paymentId, `kofi_${data.kofi_transaction_id}`))
            .limit(1);

        if (existingDonation) {
            console.log('Ko-Fi donation already processed:', data.kofi_transaction_id);
            return NextResponse.json({ received: true, duplicate: true });
        }

        // Parse amount
        const amount = parseFloat(data.amount);
        if (isNaN(amount) || amount <= 0) {
            console.error('Invalid amount in Ko-Fi webhook:', data.amount);
            return NextResponse.json(
                { error: 'Invalid amount' },
                { status: 400 }
            );
        }

        // Find the best rank for this donation amount
        const matchedRank = await findBestRankForAmount(amount);
        let rankId: string | null = null;
        let rankDays = 30; // Default to 30 days for Ko-Fi donations

        if (matchedRank) {
            rankId = matchedRank.id;
            // Calculate days based on amount vs monthly min amount
            // If they donated more than the minimum, give proportional time
            if (matchedRank.minAmount > 0) {
                rankDays = Math.floor((amount / matchedRank.minAmount) * 30);
                rankDays = Math.max(rankDays, 7); // Minimum 7 days
                rankDays = Math.min(rankDays, 365); // Maximum 1 year
            }
            console.log(`Matched Ko-Fi donation to rank: ${matchedRank.name} for ${rankDays} days`);
        }

        // Try to find user by email
        let userId: number | null = null;
        let username = data.from_name;

        if (data.email) {
            const [user] = await db
                .select()
                .from(users)
                .where(eq(users.email, data.email))
                .limit(1);

            if (user) {
                userId = user.id;
                username = user.minecraftUsername || user.username;

                // Calculate new expiration date
                const now = new Date();
                let newExpiresAt: Date;

                if (user.rankExpiresAt && new Date(user.rankExpiresAt) > now) {
                    // Extend existing rank
                    newExpiresAt = new Date(user.rankExpiresAt);
                    newExpiresAt.setDate(newExpiresAt.getDate() + rankDays);
                } else {
                    // New rank assignment
                    newExpiresAt = new Date();
                    newExpiresAt.setDate(newExpiresAt.getDate() + rankDays);
                }

                // Update user with rank and total donated
                const updateData: Record<string, any> = {
                    totalDonated: (user.totalDonated || 0) + amount,
                    updatedAt: new Date(),
                };

                if (rankId) {
                    updateData.currentRankId = rankId;
                    updateData.rankExpiresAt = newExpiresAt;
                }

                await db
                    .update(users)
                    .set(updateData)
                    .where(eq(users.id, user.id));

                if (rankId) {
                    console.log(`✅ Assigned rank ${rankId} to user ${username} until ${newExpiresAt.toISOString()}`);
                }
            }
        }

        // Create donation record
        const receiptNumber = `VN-KO-${Date.now()}-${data.kofi_transaction_id.slice(-6)}`;

        await db.insert(donations).values({
            userId,
            amount,
            currency: data.currency || 'USD',
            method: 'kofi',
            message: data.message || `Ko-Fi donation from ${data.from_name}`,
            displayed: data.is_public,
            receiptNumber,
            paymentId: `kofi_${data.kofi_transaction_id}`,
            rankId: rankId || undefined,
            days: rankDays,
            paymentType: 'one_time',
            status: 'completed',
            createdAt: new Date(),
        });

        console.log(`✅ Ko-Fi donation processed: $${amount} from ${data.from_name}${rankId ? ` → ${rankId} rank for ${rankDays} days` : ''}`);

        // Send admin notification (async, don't wait)
        sendAdminDonationAlert(username, amount, rankId || undefined)
            .catch(err => console.error('Failed to send admin donation alert:', err));

        return NextResponse.json({
            received: true,
            processed: true,
            amount,
            from: data.from_name,
            rankAssigned: rankId,
            daysGranted: rankId ? rankDays : 0,
        });

    } catch (error: any) {
        console.error('Error processing Ko-Fi webhook:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/kofi/webhook
 * Health check endpoint
 */
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        provider: 'kofi',
        message: 'Ko-Fi webhook endpoint is active',
    });
}

