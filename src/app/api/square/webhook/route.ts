/**
 * Square Webhook Handler
 * 
 * Receives payment notifications from Square and processes them
 * similar to how Stripe and Ko-fi donations are handled.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, donations, donationRanks } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { sendAdminDonationAlert } from '@/lib/email';
import { verifyWebhookSignature, loadSquareConfig } from '@/lib/square';
import { getPaymentProvider } from '@/lib/kofi';

/**
 * Square webhook payload structure for payment.completed event
 */
interface SquareWebhookEvent {
    merchant_id: string;
    type: string;
    event_id: string;
    created_at: string;
    data: {
        type: string;
        id: string;
        object: {
            payment?: {
                id: string;
                status: string;
                amount_money: {
                    amount: number; // in cents
                    currency: string;
                };
                order_id?: string;
                customer_id?: string;
                receipt_url?: string;
                buyer_email_address?: string;
            };
            order?: {
                id: string;
                location_id: string;
                state: string;
                total_money: {
                    amount: number;
                    currency: string;
                };
                metadata?: Record<string, string>;
            };
        };
    };
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
 * POST /api/square/webhook
 * Handles Square webhook events for payments
 */
export async function POST(request: NextRequest) {
    try {
        // Check if Square is the active payment provider
        const paymentProvider = await getPaymentProvider();
        if (paymentProvider !== 'square') {
            console.log('Square webhook received but payment provider is not set to Square');
            return NextResponse.json(
                { error: 'Square payments not enabled' },
                { status: 503 }
            );
        }

        const body = await request.text();
        const signature = request.headers.get('x-square-hmacsha256-signature') || '';
        const url = request.url;

        // Verify webhook signature
        const isValid = await verifyWebhookSignature(body, signature, url);
        if (!isValid) {
            console.error('Invalid Square webhook signature');
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 401 }
            );
        }

        const event: SquareWebhookEvent = JSON.parse(body);

        console.log('Square webhook received:', {
            type: event.type,
            eventId: event.event_id,
        });

        // Handle payment.completed event
        if (event.type === 'payment.completed') {
            await handlePaymentCompleted(event);
        } else if (event.type === 'order.fulfillment.updated' || event.type === 'order.updated') {
            // Handle order-based events if needed
            console.log(`Square event ${event.type} received, skipping (handled via payment.completed)`);
        } else {
            console.log(`Square webhook type ${event.type} not handled`);
        }

        return NextResponse.json({ received: true });
    } catch (error: unknown) {
        console.error('Error processing Square webhook:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}

/**
 * Handle payment.completed event
 */
async function handlePaymentCompleted(event: SquareWebhookEvent) {
    const payment = event.data.object.payment;
    if (!payment) {
        console.error('No payment object in Square webhook');
        return;
    }

    // Check for duplicate webhook (idempotency)
    const [existingDonation] = await db
        .select()
        .from(donations)
        .where(eq(donations.paymentId, `square_${payment.id}`))
        .limit(1);

    if (existingDonation) {
        console.log('Square payment already processed:', payment.id);
        return;
    }

    // Parse amount (Square sends in cents)
    const amountCents = Number(payment.amount_money.amount);
    const amount = amountCents / 100;
    const currency = payment.amount_money.currency || 'USD';

    // Try to get order metadata for user info
    let userId: number | null = null;
    let rankId: string | null = null;
    let rankDays = 30; // Default to 30 days
    let username = 'Anonymous';
    let foundUser: typeof users.$inferSelect | undefined;

    // If we have an order_id, try to get metadata from the order
    if (payment.order_id) {
        try {
            const { getSquareClient } = await import('@/lib/square');
            const client = await getSquareClient();
            const orderResponse = await client.ordersApi.retrieveOrder(payment.order_id);
            const order = orderResponse.result.order;

            if (order?.metadata) {
                const metadata = order.metadata;
                if (metadata.userId) {
                    const userIdNum = parseInt(metadata.userId);
                    const [user] = await db
                        .select()
                        .from(users)
                        .where(eq(users.id, userIdNum))
                        .limit(1);
                    if (user) {
                        foundUser = user;
                        userId = user.id;
                        username = user.minecraftUsername || user.username;
                    }
                }
                if (metadata.rankId) {
                    rankId = metadata.rankId;
                }
                if (metadata.days) {
                    rankDays = parseInt(metadata.days);
                }
            }
        } catch (error) {
            console.error('Error fetching Square order details:', error);
        }
    }

    // Fallback: Try to find user by email
    if (!foundUser && payment.buyer_email_address) {
        const [userByEmail] = await db
            .select()
            .from(users)
            .where(eq(users.email, payment.buyer_email_address))
            .limit(1);

        if (userByEmail) {
            foundUser = userByEmail;
            userId = userByEmail.id;
            username = userByEmail.minecraftUsername || userByEmail.username;
            console.log(`Found user by email: ${payment.buyer_email_address}`);
        }
    }

    // If no rank specified, find best rank based on amount
    if (!rankId) {
        const matchedRank = await findBestRankForAmount(amount);
        if (matchedRank) {
            rankId = matchedRank.id;
            // Calculate days based on amount vs monthly min amount
            if (matchedRank.minAmount > 0) {
                rankDays = Math.floor((amount / matchedRank.minAmount) * 30);
                rankDays = Math.max(rankDays, 7); // Minimum 7 days
                rankDays = Math.min(rankDays, 365); // Maximum 1 year
            }
            console.log(`Matched Square payment to rank: ${matchedRank.name} for ${rankDays} days`);
        }
    }

    // Update user if found
    if (foundUser) {
        // Calculate new expiration date
        const now = new Date();
        let newExpiresAt: Date;

        if (foundUser.rankExpiresAt && new Date(foundUser.rankExpiresAt) > now) {
            // Extend existing rank
            newExpiresAt = new Date(foundUser.rankExpiresAt);
            newExpiresAt.setDate(newExpiresAt.getDate() + rankDays);
        } else {
            // New rank assignment
            newExpiresAt = new Date();
            newExpiresAt.setDate(newExpiresAt.getDate() + rankDays);
        }

        // Update user with rank and total donated
        const updateData: Record<string, unknown> = {
            totalDonated: (foundUser.totalDonated || 0) + amount,
            updatedAt: new Date(),
        };

        if (rankId) {
            updateData.donationRankId = rankId;
            updateData.rankExpiresAt = newExpiresAt;
        }

        await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, foundUser.id));

        if (rankId) {
            console.log(`✅ Assigned rank ${rankId} to user ${username} until ${newExpiresAt.toISOString()}`);
        }
    }

    // Create donation record
    const receiptNumber = `VN-SQ-${Date.now()}-${payment.id.slice(-6)}`;

    await db.insert(donations).values({
        userId,
        amount,
        currency,
        method: 'square',
        message: rankId ? `${rankId} Rank - ${rankDays} days` : 'Square donation',
        displayed: true,
        receiptNumber,
        paymentId: `square_${payment.id}`,
        rankId: rankId || undefined,
        days: rankDays,
        paymentType: 'one_time',
        status: 'completed',
        createdAt: new Date(),
    });

    console.log(`✅ Square payment processed: $${amount} from ${username}${rankId ? ` → ${rankId} rank for ${rankDays} days` : ''}`);

    // Send admin notification (async, don't wait)
    sendAdminDonationAlert(username, amount, rankId || undefined)
        .catch(err => console.error('Failed to send admin donation alert:', err));
}

/**
 * GET /api/square/webhook
 * Health check endpoint
 */
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        provider: 'square',
        message: 'Square webhook endpoint is active',
    });
}
