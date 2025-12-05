import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createPortalSession, getOrCreateCustomer, isStripeConfigured } from '@/lib/stripe';

/**
 * POST /api/stripe/portal
 * Creates a Stripe Customer Portal session for the authenticated user
 * to manage their subscription (cancel, update payment method, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    const stripeConfigured = await isStripeConfigured();
    if (!stripeConfigured) {
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 503 }
      );
    }

    // Require authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Please log in to manage your subscription' },
        { status: 401 }
      );
    }

    const sessionUser = session.user as any;
    const userId = parseInt(sessionUser.id);

    // Get user from database
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

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      customerId = await getOrCreateCustomer({
        userId,
        email: user.email || undefined,
        username: user.username,
      });

      // Save customer ID to database
      await db
        .update(users)
        .set({
          stripeCustomerId: customerId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }

    // Create portal session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const portalSession = await createPortalSession({
      customerId,
      returnUrl: `${appUrl}/settings`,
    });

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}

