/**
 * Square Subscription Management API
 * 
 * Allows users to cancel their Square subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cancelSquareSubscription, getSquareSubscription, isSquareConfigured } from '@/lib/square';
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
                { error: 'Please log in' },
                { status: 401 }
            );
        }

        const userId = parseInt(session.user.id as string);

        // Get user's subscription
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (!user || !user.squareSubscriptionId) {
            return NextResponse.json(
                { error: 'No active Square subscription found' },
                { status: 404 }
            );
        }

        // Cancel the subscription
        await cancelSquareSubscription(user.squareSubscriptionId);

        // Update user record
        await db
            .update(users)
            .set({
                subscriptionStatus: 'canceled',
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

        console.log(`✅ Canceled Square subscription for user ${userId}`);

        return NextResponse.json({
            success: true,
            message: 'Subscription canceled successfully. You will retain access until the end of your current billing period.',
        });
    } catch (error) {
        console.error('Error canceling Square subscription:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            error
        });
        return NextResponse.json(
            {
                error: 'Failed to cancel subscription. Please try again or contact support.',
                details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
            },
            { status: 500 }
        );
    }
}

/**
 * GET - Retrieve subscription details
 */
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Please log in' },
                { status: 401 }
            );
        }

        const userId = parseInt(session.user.id as string);

        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (!user || !user.squareSubscriptionId) {
            return NextResponse.json({
                hasSubscription: false,
            });
        }

        // Get subscription details from Square
        const subscription = await getSquareSubscription(user.squareSubscriptionId);

        return NextResponse.json({
            hasSubscription: true,
            status: subscription?.status || user.subscriptionStatus,
            subscriptionId: user.squareSubscriptionId,
        });
    } catch (error) {
        console.error('Error fetching Square subscription:', error);
        return NextResponse.json(
            { error: 'Failed to fetch subscription details' },
            { status: 500 }
        );
    }
}
