import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/db';
import { users, donationRanks, donations } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events for subscription lifecycle
 */
export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    console.error('Stripe not configured');
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const stripe = new Stripe(stripeSecretKey);

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('Stripe webhook event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session, stripe);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice, stripe);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice, stripe);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session, stripe: Stripe) {
  console.log('Checkout session completed:', session.id);

  const userId = session.client_reference_id || session.metadata?.userId;
  if (!userId) {
    console.error('No user ID found in checkout session');
    return;
  }

  // For subscriptions, the invoice.payment_succeeded event will handle rank assignment
  if (session.mode === 'subscription') {
    console.log('Subscription checkout completed, waiting for payment event');
    return;
  }

  // One-time payments are handled by payment_intent.succeeded
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, stripe: Stripe) {
  const subscriptionId = (invoice as any).subscription as string;
  
  if (!subscriptionId) {
    console.log('No subscription ID in invoice');
    return;
  }

  // Check idempotency
  const [existingReceipt] = await db
    .select()
    .from(donations)
    .where(eq(donations.paymentId, invoice.id))
    .limit(1);

  if (existingReceipt) {
    console.log('Invoice already processed:', invoice.id);
    return;
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const metadata = subscription.metadata;

  if (!metadata?.userId || !metadata?.rankId || !metadata?.days) {
    console.error('Missing metadata in subscription');
    return;
  }

  const userId = Number(metadata.userId);
  const rankId = metadata.rankId;
  const days = Number(metadata.days);

  // Get user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    console.error('User not found:', userId);
    return;
  }

  // Get rank
  const [rank] = await db
    .select()
    .from(donationRanks)
    .where(eq(donationRanks.id, rankId));

  if (!rank) {
    console.error('Rank not found:', rankId);
    return;
  }

  // Calculate new expiry date
  const now = new Date();
  let expiresAt: Date;

  if (user.rankExpiresAt && new Date(user.rankExpiresAt) > now) {
    const currentExpiry = new Date(user.rankExpiresAt);
    expiresAt = new Date(currentExpiry);
    expiresAt.setDate(expiresAt.getDate() + days);
    console.log(`Extending rank from ${currentExpiry.toISOString()} to ${expiresAt.toISOString()}`);
  } else {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    console.log(`Starting new rank, expires at ${expiresAt.toISOString()}`);
  }

  // Update user's rank and subscription info
  const amount = (invoice.amount_paid || 0) / 100;
  const isFirstPayment = invoice.billing_reason === 'subscription_create';

  await db
    .update(users)
    .set({
      donationRankId: rankId,
      rankExpiresAt: expiresAt,
      totalDonated: (user.totalDonated || 0) + amount,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: 'active',
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Create donation record
  const receiptNumber = `VN-${Date.now()}-${userId}`;
  await db.insert(donations).values({
    userId,
    minecraftUsername: user.minecraftUsername,
    minecraftUuid: user.minecraftUuid,
    amount,
    currency: invoice.currency?.toUpperCase() || 'USD',
    method: 'stripe',
    receiptNumber,
    paymentId: invoice.id,
    subscriptionId: subscriptionId,
    rankId,
    days,
    paymentType: isFirstPayment ? 'subscription' : 'subscription_renewal',
    status: 'completed',
    message: `${rank.name} Rank - ${days} days ${isFirstPayment ? '(Subscription)' : '(Renewal)'}`,
    displayed: true,
  });

  console.log(`✅ Rank extended for user ${userId} until ${expiresAt}, receipt: ${receiptNumber}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, stripe: Stripe) {
  const subscriptionId = (invoice as any).subscription as string;

  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.userId;

  if (!userId) return;

  console.log(`⚠️ Payment failed for user ${userId}, subscription ${subscriptionId}`);

  // Update subscription status to past_due
  await db
    .update(users)
    .set({
      subscriptionStatus: 'past_due',
      updatedAt: new Date(),
    })
    .where(eq(users.id, Number(userId)));

  // Check attempt count - after 3 failed attempts, cancel subscription
  const attemptCount = invoice.attempt_count || 0;
  if (attemptCount >= 3) {
    console.log(`❌ Max retry attempts reached for user ${userId}, canceling subscription`);

    // Cancel the subscription immediately
    try {
      await stripe.subscriptions.cancel(subscriptionId);
    } catch (err) {
      console.error('Error canceling subscription:', err);
    }

    // Remove user's rank
    await db
      .update(users)
      .set({
        donationRankId: null,
        rankExpiresAt: null,
        stripeSubscriptionId: null,
        subscriptionStatus: 'canceled',
        updatedAt: new Date(),
      })
      .where(eq(users.id, Number(userId)));

    console.log(`✅ Rank removed from user ${userId} due to failed payments`);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.log('No userId in subscription metadata');
    return;
  }

  const canceledAt = subscription.canceled_at;
  const endedAt = subscription.ended_at;
  const wasImmediateCancellation = canceledAt && endedAt && (canceledAt === endedAt);

  if (wasImmediateCancellation) {
    // Immediate cancellation - remove rank now
    await db
      .update(users)
      .set({
        donationRankId: null,
        rankExpiresAt: null,
        stripeSubscriptionId: null,
        subscriptionStatus: 'canceled',
        updatedAt: new Date(),
      })
      .where(eq(users.id, Number(userId)));

    console.log(`✅ Rank immediately removed for user ${userId}`);
  } else {
    // Scheduled cancellation - clear subscription but rank expires naturally
    await db
      .update(users)
      .set({
        stripeSubscriptionId: null,
        subscriptionStatus: 'canceled',
        updatedAt: new Date(),
      })
      .where(eq(users.id, Number(userId)));

    console.log(`ℹ️ Subscription ended for user ${userId}, rank will expire naturally`);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;

  if (!userId) return;

  // Update subscription status in database
  let status: 'active' | 'canceled' | 'past_due' | 'paused' | 'trialing' = 'active';

  if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
    status = 'canceled';
  } else if (subscription.status === 'past_due') {
    status = 'past_due';
  } else if (subscription.status === 'paused') {
    status = 'paused';
  } else if (subscription.status === 'trialing') {
    status = 'trialing';
  }

  await db
    .update(users)
    .set({
      subscriptionStatus: status,
      updatedAt: new Date(),
    })
    .where(eq(users.id, Number(userId)));

  if (subscription.cancel_at_period_end) {
    console.log(`⚠️ Subscription ${subscription.id} scheduled to cancel at period end for user ${userId}`);
  }

  if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    console.log(`❌ Subscription ${subscription.id} is ${subscription.status}`);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const metadata = paymentIntent.metadata || {};
  const userId = metadata.userId;
  const rankId = metadata.rankId;
  const days = metadata.days || '0';

  if (!userId) {
    console.log('Missing userId in payment_intent metadata, skipping');
    return;
  }

  // Check idempotency
  const [existingReceipt] = await db
    .select()
    .from(donations)
    .where(eq(donations.paymentId, paymentIntent.id))
    .limit(1);

  if (existingReceipt) {
    console.log('Payment already processed:', paymentIntent.id);
    return;
  }

  // Get user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, Number(userId)))
    .limit(1);

  if (!user) {
    console.error('User not found:', userId);
    return;
  }

  const amount = paymentIntent.amount / 100;
  const daysNum = Number(days);
  const isOneTimeTip = rankId === 'one-time' || !rankId || daysNum === 0;

  // Get rank (if not a pure tip)
  let rank = null;
  if (!isOneTimeTip && rankId) {
    const [foundRank] = await db
      .select()
      .from(donationRanks)
      .where(eq(donationRanks.id, rankId))
      .limit(1);
    rank = foundRank;
  }

  // If it's a rank purchase but rank not found, log error but still record donation
  if (!isOneTimeTip && !rank) {
    console.error('Rank not found:', rankId);
  }

  // Update user's rank only if purchasing a rank
  if (rank && daysNum > 0) {
    const now = new Date();
    let expiresAt: Date;

    if (user.rankExpiresAt && new Date(user.rankExpiresAt) > now) {
      const currentExpiry = new Date(user.rankExpiresAt);
      expiresAt = new Date(currentExpiry);
      expiresAt.setDate(expiresAt.getDate() + daysNum);
    } else {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + daysNum);
    }

    await db
      .update(users)
      .set({
        donationRankId: rankId,
        rankExpiresAt: expiresAt,
        totalDonated: (user.totalDonated || 0) + amount,
        updatedAt: new Date(),
      })
      .where(eq(users.id, Number(userId)));

    console.log(`✅ One-time payment processed for user ${userId}, rank ${rankId} until ${expiresAt.toISOString()}`);
  } else {
    // Just update total donated for tips
    await db
      .update(users)
      .set({
        totalDonated: (user.totalDonated || 0) + amount,
        updatedAt: new Date(),
      })
      .where(eq(users.id, Number(userId)));

    console.log(`✅ One-time tip processed for user ${userId}, amount: $${amount}`);
  }

  // Create donation record
  const receiptNumber = `VN-${Date.now()}-${userId}`;
  const donationMessage = rank
    ? `${rank.name} Rank - ${days} days`
    : 'One-time donation - Thank you!';

  await db.insert(donations).values({
    userId: Number(userId),
    minecraftUsername: user.minecraftUsername,
    minecraftUuid: user.minecraftUuid,
    amount,
    currency: paymentIntent.currency?.toUpperCase() || 'USD',
    method: 'stripe',
    receiptNumber,
    paymentId: paymentIntent.id,
    rankId: rank ? rankId : null,
    days: daysNum || null,
    paymentType: 'one_time',
    status: 'completed',
    message: donationMessage,
    displayed: true,
  });
}
