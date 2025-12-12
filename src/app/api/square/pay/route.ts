/**
 * Square One-Time Payment API
 * 
 * Processes a one-time payment using a card nonce from Square Web Payments SDK
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSquareClient, loadSquareConfig, isSquareConfigured } from '@/lib/square';
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
                { error: 'Payment system not configured' },
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
        const { orderId, cardNonce } = body;

        // Validate input - orderId is now required
        if (!orderId || !cardNonce) {
            return NextResponse.json(
                { error: 'Missing required fields: orderId, cardNonce' },
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

        const client = await getSquareClient();
        const config = await loadSquareConfig();

        // Retrieve the order to get metadata (amount, rankId, days)
        const orderResponse = await client.ordersApi.retrieveOrder(orderId);
        const order = orderResponse.result.order;

        if (!order) {
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            );
        }

        // Verify the order belongs to this user
        if (order.metadata?.userId !== userId.toString()) {
            return NextResponse.json(
                { error: 'Order does not belong to this user' },
                { status: 403 }
            );
        }

        // Get order details from metadata
        const rankId = order.metadata?.rankId;
        const days = parseInt(order.metadata?.days || '30');
        const rankName = order.metadata?.rankName || 'Rank';

        // Get amount from order total
        const amountInCents = Number(order.totalMoney?.amount || 0);

        if (amountInCents <= 0) {
            return NextResponse.json(
                { error: 'Invalid order amount' },
                { status: 400 }
            );
        }

        // Create payment attached to the order
        const paymentResponse = await client.paymentsApi.createPayment({
            sourceId: cardNonce,
            idempotencyKey: `pay-${crypto.randomUUID()}`,
            amountMoney: {
                amount: BigInt(amountInCents),
                currency: 'USD',
            },
            orderId, // Attach payment to the order
            locationId: config.locationId,
            note: `${rankName} - ${days} days`,
            buyerEmailAddress: user.email || undefined,
            referenceId: rankId || undefined,
        });

        if (!paymentResponse.result.payment?.id) {
            throw new Error('Failed to process Square payment');
        }

        const paymentId = paymentResponse.result.payment.id;
        const amountInDollars = amountInCents / 100;
        console.log(`✅ Square payment successful: ${paymentId} for order ${orderId}, user ${userId}`);

        // Immediately update user's rank (don't wait for webhook)
        const now = new Date();
        let newExpiresAt: Date;

        if (user.rankExpiresAt && new Date(user.rankExpiresAt) > now) {
            // Extend existing rank
            newExpiresAt = new Date(user.rankExpiresAt);
            newExpiresAt.setDate(newExpiresAt.getDate() + days);
        } else {
            // New rank assignment
            newExpiresAt = new Date();
            newExpiresAt.setDate(newExpiresAt.getDate() + days);
        }

        // Update user with rank and total donated
        const updateData: Record<string, unknown> = {
            totalDonated: (user.totalDonated || 0) + amountInDollars,
            rankExpiresAt: newExpiresAt,
            updatedAt: new Date(),
        };

        // Only update rank if it's a real rank (not 'one-time' tip)
        if (rankId && rankId !== 'one-time') {
            updateData.donationRankId = rankId;
        }

        await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, userId));

        // Record donation in database
        const { donations } = await import('@/db/schema');
        await db.insert(donations).values({
            userId,
            amount: amountInDollars,
            currency: 'USD',
            method: 'square',
            paymentId: `square_${paymentId}`,
            rankId: rankId && rankId !== 'one-time' ? rankId : null,
            days,
            paymentType: 'one_time',
            status: 'completed',
            message: `Order: ${orderId}`,
        });

        console.log(`✅ Square rank updated: user ${userId}, rank ${rankId}, expires ${newExpiresAt.toISOString()}`);

        return NextResponse.json({
            success: true,
            paymentId,
            orderId,
            rankUpdated: true,
            expiresAt: newExpiresAt.toISOString(),
        });
    } catch (error) {
        console.error('Error processing Square payment:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            error
        });
        return NextResponse.json(
            {
                error: 'Failed to process payment. Please try again.',
                details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
            },
            { status: 500 }
        );
    }
}

