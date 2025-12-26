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
import crypto from 'crypto';

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

        // Validate input - require amount always, other fields depend on payment type
        if (amount === undefined || amount === null) {
            return NextResponse.json(
                { error: 'Missing required field: amount' },
                { status: 400 }
            );
        }

        // Handle one-time tips (no rank)
        const isOneTimeTip = rankId === 'one-time' || !rankId || days === 0;

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

        let rankName = 'One-Time Donation';
        let daysValue = 0;

        if (!isOneTimeTip) {
            // Get rank details for rank purchases
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

            rankName = rank.name;
            daysValue = parseInt(days) || 30;
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
                        name: isOneTimeTip ? 'One-Time Donation' : `${rankName} Rank`,
                        quantity: '1',
                        basePriceMoney: {
                            amount: BigInt(amountInCents),
                            currency: 'USD',
                        },
                        note: isOneTimeTip ? 'Thank you for your support!' : `${daysValue} days of ${rankName} rank benefits`,
                    },
                ],
                metadata: {
                    userId: userId.toString(),
                    rankId: isOneTimeTip ? 'one-time' : rankId,
                    rankName,
                    days: daysValue.toString(),
                    type: 'one_time',
                },
            },
            idempotencyKey: `ord-${crypto.randomUUID()}`,
        });

        if (!orderResponse.result.order?.id) {
            throw new Error('Failed to create Square order');
        }

        const orderId = orderResponse.result.order.id;

        console.log(`Created Square order ${orderId} for user ${userId}, rank ${isOneTimeTip ? 'one-time' : rankId}`);

        // Return order details for client-side payment form
        // Client will show Square Web Payments SDK card form and call /api/square/pay
        return NextResponse.json({
            orderId,
            amount: parseFloat(amount),
            rankName,
            days: daysValue,
            // No URL - client handles payment modal
        });
    } catch (error: any) {
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
