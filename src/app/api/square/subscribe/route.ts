/**
 * Square Subscribe API
 * 
 * Creates a Square subscription for a user with card on file
 * This is called after the user enters their card via Square Web Payments SDK
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { users, donationRanks, donations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
    getOrCreateSquareCustomer,
    saveCardOnFile,
    ensureRankSquareSetup,
    createSquareSubscription,
    isSquareConfigured
} from '@/lib/square';
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
                { error: 'Payment system not configured. Please set up Square in the admin dashboard.' },
                { status: 503 }
            );
        }

        // Require authentication
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Please log in to subscribe' },
                { status: 401 }
            );
        }

        const userId = parseInt(session.user.id as string);
        const body = await request.json();
        const { rankId, cardNonce } = body;

        // Validate input
        if (!rankId || !cardNonce) {
            return NextResponse.json(
                { error: 'Missing required fields: rankId, cardNonce' },
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

        if (!user.email) {
            return NextResponse.json(
                { error: 'Email is required for subscriptions. Please update your account settings.' },
                { status: 400 }
            );
        }

        // Check if user already has an active Square subscription
        if (user.squareSubscriptionId && user.subscriptionStatus === 'active') {
            return NextResponse.json(
                { error: 'You already have an active subscription. Please cancel it first or manage it in settings.' },
                { status: 400 }
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

        // Step 1: Get or create Square customer
        const customerId = await getOrCreateSquareCustomer(
            userId,
            user.email,
            user.minecraftUsername || user.username
        );

        // Step 2: Save card on file
        const cardId = await saveCardOnFile(customerId, cardNonce);

        // Step 3: Ensure rank has Square subscription plan and variation
        const { variationId } = await ensureRankSquareSetup({
            id: rank.id,
            name: rank.name,
            minAmount: rank.minAmount,
            squareSubscriptionPlanId: rank.squareSubscriptionPlanId,
            squareSubscriptionPlanVariationId: rank.squareSubscriptionPlanVariationId,
        });

        // Step 4: Create subscription
        const subscriptionId = await createSquareSubscription({
            customerId,
            planVariationId: variationId,
            cardId,
            userId,
            rankId: rank.id,
        });

        // Step 5: Update user's rank immediately (subscription is active)
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 30); // Monthly subscription

        await db
            .update(users)
            .set({
                donationRankId: rank.id,
                rankExpiresAt: newExpiresAt,
                totalDonated: (user.totalDonated || 0) + rank.minAmount,
                squareSubscriptionId: subscriptionId,
                subscriptionStatus: 'active',
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

        // Step 6: Record donation in database for donation history
        await db.insert(donations).values({
            userId,
            amount: rank.minAmount,
            currency: 'USD',
            method: 'square',
            paymentId: `square_sub_${subscriptionId}`,
            subscriptionId,
            rankId: rank.id,
            days: 30,
            paymentType: 'subscription',
            status: 'completed',
            message: `${rank.name} Monthly Subscription`,
        });

        console.log(`✅ Square subscription ${subscriptionId} created for user ${userId}, rank ${rank.name}`);

        // Send Discord donation notification (non-blocking)
        try {
            const { sendDonationDiscordNotification } = await import('@/lib/discord-notifications');
            sendDonationDiscordNotification({
                username: user.username,
                minecraftUsername: user.minecraftUsername,
                amount: rank.minAmount,
                currency: 'USD',
                rankName: rank.name,
                days: 30,
                paymentType: 'subscription',
            }).catch((err: Error) => console.error('Discord notification error:', err));
        } catch (e: any) {
            console.error('Failed to load Discord notification module:', e);
        }

        // Send email receipt (non-blocking)
        try {
            if (user.email) {
                const { sendDonationReceiptEmail } = await import('@/lib/email');
                sendDonationReceiptEmail({
                    to: user.email,
                    username: user.username,
                    amount: rank.minAmount,
                    rankName: rank.name,
                    days: 30,
                    paymentId: subscriptionId,
                }).catch((err: Error) => console.error('Email receipt error:', err));
            }
        } catch (e: any) {
            console.error('Failed to load email module:', e);
        }

        return NextResponse.json({
            success: true,
            subscriptionId,
            message: `Successfully subscribed to ${rank.name} rank!`,
        });
    } catch (error: any) {
        console.error('Error creating Square subscription:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            error
        });
        return NextResponse.json(
            {
                error: 'Failed to create subscription. Please try again.',
                details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
            },
            { status: 500 }
        );
    }
}
