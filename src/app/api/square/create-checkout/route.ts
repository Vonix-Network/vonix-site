/**
 * Square Checkout API
 * 
 * Creates a Square checkout link for one-time rank purchases
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { users, donationRanks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isSquareConfigured } from '@/lib/square';
import { getPaymentProvider } from '@/lib/kofi';

export async function POST(request: NextRequest) {
    try {
        // Check if Square is the active payment provider
        const paymentProvider = await getPaymentProvider();
        if (paymentProvider !== 'square') {
            return NextResponse.json(
                { error: 'Square payments not enabled' },
                { status: 503 }
            );
        }

        // Check if Square is configured
        const squareConfigured = await isSquareConfigured();
        if (!squareConfigured) {
            return NextResponse.json(
                { error: 'Payment system not configured. Please set up Square in the admin dashboard under Settings > Payments.' },
                { status: 503 }
            );
        }

        // Require authentication
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Please log in to make a donation' },
                { status: 401 }
            );
        }

        const userId = parseInt(session.user.id as string);
        const body = await request.json();
        const { rankId, amount, days, paymentType } = body;

        // Validate input
        if (!rankId || !amount || !days) {
            return NextResponse.json(
                { error: 'Missing required fields: rankId, amount, days' },
                { status: 400 }
            );
        }

        // Get user details
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Get rank details
        const [rank] = await db
            .select()
            .from(donationRanks)
            .where(eq(donationRanks.id, rankId))
            .limit(1);

        if (!rank) {
            return NextResponse.json(
                { error: 'Rank not found' },
                { status: 404 }
            );
        }

        // Note: Square only supports one-time payments via checkout links
        // Subscriptions would require Square Subscriptions API which is more complex
        if (paymentType === 'subscription') {
            return NextResponse.json(
                { error: 'Square subscriptions require card entry. Use the subscription modal instead.' },
                { status: 400 }
            );
        }

        // Create the order in Square (for one-time payment)
        const client = (await import('@/lib/square')).getSquareClient;
        const squareClient = await client();
        const config = await (await import('@/lib/square')).loadSquareConfig();

        const amountInCents = Math.round(parseFloat(amount) * 100);

        const orderResponse = await squareClient.ordersApi.createOrder({
            order: {
                locationId: config.locationId,
                lineItems: [
                    {
                        name: `${rank.name} Rank`,
                        quantity: '1',
                        basePriceMoney: {
                            amount: BigInt(amountInCents),
                            currency: 'USD',
                        },
                        note: `${days} days of ${rank.name} rank benefits`,
                    },
                ],
                metadata: {
                    userId: userId.toString(),
                    rankId,
                    rankName: rank.name,
                    days: days.toString(),
                    type: 'one_time',
                },
            },
            idempotencyKey: `vonix-order-${userId}-${Date.now()}`,
        });

        if (!orderResponse.result.order?.id) {
            throw new Error('Failed to create Square order');
        }

        const orderId = orderResponse.result.order.id;

        console.log(`Created Square order ${orderId} for user ${userId}, rank ${rankId}`);

        // Return order details for client-side payment form
        // Client will show Square Web Payments SDK card form and call /api/square/pay
        return NextResponse.json({
            orderId,
            amount: parseFloat(amount),
            rankName: rank.name,
            days: parseInt(days),
            // No URL - client handles payment modal
        });
    } catch (error) {
        console.error('Error creating Square checkout:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            error
        });
        return NextResponse.json(
            {
                error: 'Failed to create checkout session. Please try again.',
                details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
            },
            { status: 500 }
        );
    }
}
