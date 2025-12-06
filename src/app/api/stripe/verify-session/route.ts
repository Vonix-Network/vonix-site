import { NextRequest, NextResponse } from 'next/server';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { db } from '@/db';
import { donationRanks } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const stripeConfigured = await isStripeConfigured();
    if (!stripeConfigured) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    const metadata = session.metadata || {};
    const rankId = metadata.rankId;
    const days = parseInt(metadata.days || '30');
    const amount = (session.amount_total || 0) / 100;

    let rankName = 'Supporter';
    if (rankId) {
      const [rank] = await db
        .select()
        .from(donationRanks)
        .where(eq(donationRanks.id, rankId))
        .limit(1);

      if (rank) {
        rankName = rank.name;
      }
    }

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    return NextResponse.json({
      success: true,
      rankName,
      amount,
      days,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Error verifying session:', error);
    return NextResponse.json(
      { error: 'Failed to verify session' },
      { status: 500 }
    );
  }
}

