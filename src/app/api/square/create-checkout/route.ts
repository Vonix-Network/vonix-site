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
import { createCheckoutLink, isSquareConfigured } from '@/lib/square';
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
                { error: 'Square does not support subscriptions. Please use one-time payment or switch to Stripe for subscriptions.' },
                { status: 400 }
            );
        }

        // Create redirect URL
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const redirectUrl = `${appUrl}/donate/success?provider=square`;

        // Create Square checkout link
        const { checkoutUrl, orderId } = await createCheckoutLink({
            userId,
            rankId,
            rankName: rank.name,
            amount: parseFloat(amount),
            days: parseInt(days),
            customerEmail: user.email || undefined,
            redirectUrl,
        });

        console.log(`Created Square checkout for user ${userId}, rank ${rankId}, order ${orderId}`);

        return NextResponse.json({
            url: checkoutUrl,
            orderId,
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
