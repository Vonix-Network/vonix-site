import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { donationRanks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  createCheckoutSession,
  createSubscriptionCheckout,
  isStripeConfigured,
  ensureRankStripeSetup
} from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured (loads from database first, env vars as fallback)
    const stripeConfigured = await isStripeConfigured();
    if (!stripeConfigured) {
      return NextResponse.json(
        { error: 'Payment system not configured. Please set up Stripe in the admin dashboard under Settings > Payments.' },
        { status: 503 }
      );
    }

    // Check authentication - only required for rank purchases
    const session = await auth();
    const user = session?.user as any;

    const body = await request.json();
    const {
      rankId,
      days = 30,
      amount: customAmount,
      paymentType = 'one_time',
      guestName,
      guestMinecraftUsername
    } = body;

    // Require authentication for rank purchases (not one-time donations)
    if (rankId !== 'one-time' && rankId && !session?.user) {
      return NextResponse.json(
        { error: 'Please log in to purchase a rank' },
        { status: 401 }
      );
    }

    // Only accept one_time payments - subscriptions are no longer offered
    if (paymentType === 'subscription') {
      return NextResponse.json(
        { error: 'Subscriptions are no longer available. Please use one-time payment instead.' },
        { status: 400 }
      );
    }

    if (paymentType !== 'one_time') {
      return NextResponse.json(
        { error: 'Invalid payment type' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    let checkoutSession;

    // Handle one-time donations without a rank (allows guests)
    if (rankId === 'one-time' || !rankId) {
      const amount = customAmount || 5;

      if (amount < 1) {
        return NextResponse.json(
          { error: 'Minimum donation is $1' },
          { status: 400 }
        );
      }

      // Determine if this is a guest donation
      const isGuest = !session?.user;
      const donorName = isGuest ? guestName : user?.name || user?.username;
      const donorMinecraftUsername = isGuest ? (guestMinecraftUsername || 'Maid') : undefined;

      checkoutSession = await createCheckoutSession({
        userId: isGuest ? 0 : parseInt(user.id), // 0 for guests
        rankId: 'one-time',
        rankName: 'One-Time Donation',
        amount,
        days: 0,
        customerEmail: isGuest ? undefined : user.email,
        successUrl: `${appUrl}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${appUrl}/donate?canceled=true`,
        // Pass guest info as metadata
        metadata: isGuest ? {
          isGuest: 'true',
          guestName: donorName || 'Anonymous',
          guestMinecraftUsername: donorMinecraftUsername || 'Maid',
        } : undefined,
      });
    } else {
      // Handle rank purchases/subscriptions
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

      if (paymentType === 'subscription') {
        // Auto-create Stripe product and price if not configured
        // This will create the product/price in Stripe and update the database
        const stripePriceId = await ensureRankStripeSetup({
          id: rank.id,
          name: rank.name,
          priceMonth: rank.minAmount,
          stripePriceMonthly: rank.stripePriceMonthly,
        });

        checkoutSession = await createSubscriptionCheckout({
          userId: parseInt(user.id),
          rankId,
          rankName: rank.name,
          priceId: stripePriceId,
          days: 30, // Monthly subscription
          customerEmail: user.email,
          successUrl: `${appUrl}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${appUrl}/donate?canceled=true`,
        });
      } else {
        // One-time payment - calculate price based on days
        // minAmount is in DOLLARS (e.g., 4.99), NOT cents
        const monthlyPriceDollars = rank.minAmount || 5;
        const pricePerDay = monthlyPriceDollars / 30;
        const calculatedAmount = customAmount || Math.round(pricePerDay * days * 100) / 100;

        checkoutSession = await createCheckoutSession({
          userId: parseInt(user.id),
          rankId,
          rankName: rank.name,
          amount: calculatedAmount,
          days,
          customerEmail: user.email,
          successUrl: `${appUrl}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${appUrl}/donate?canceled=true`,
        });
      }
    }

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', {
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

