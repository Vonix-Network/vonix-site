/**
 * Square One-Time Payment API
 * 
 * Processes a one-time payment using a card nonce from Square Web Payments SDK
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { users, donationRanks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSquareClient, loadSquareConfig, isSquareConfigured } from '@/lib/square';
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
        const { rankId, amount, days, cardNonce } = body;

        // Validate input
        if (!rankId || !amount || !days || !cardNonce) {
            return NextResponse.json(
                { error: 'Missing required fields: rankId, amount, days, cardNonce' },
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

        const client = await getSquareClient();
        const config = await loadSquareConfig();
        const amountInCents = Math.round(parseFloat(amount) * 100);

        // Create payment
        const paymentResponse = await client.paymentsApi.createPayment({
            sourceId: cardNonce,
            idempotencyKey: `vonix-payment-${userId}-${Date.now()}`,
            amountMoney: {
                amount: BigInt(amountInCents),
                currency: 'USD',
            },
            locationId: config.locationId,
            note: `${rank.name} Rank - ${days} days`,
            buyerEmailAddress: user.email || undefined,
            referenceId: rankId,
        });

        if (!paymentResponse.result.payment?.id) {
            throw new Error('Failed to process Square payment');
        }

        const paymentId = paymentResponse.result.payment.id;
        console.log(`✅ Square payment successful: ${paymentId} for user ${userId}`);

        // The webhook will handle rank assignment
        // For now, just return success
        return NextResponse.json({
            success: true,
            paymentId,
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
