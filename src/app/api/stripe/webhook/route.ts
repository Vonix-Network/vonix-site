import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/db';
import { users, siteSettings } from '@/db/schema';
import { eq, like } from 'drizzle-orm';
import { processDonation } from '@/lib/donations';

/**
 * Load Stripe config from database, with env vars as fallback
 */
async function loadStripeConfig() {
  try {
    const settings = await db
      .select()
      .from(siteSettings)
      .where(like(siteSettings.key, 'stripe_%'));

    const dbSettings: Record<string, string> = {};
    settings.forEach(s => {
      if (s.value) dbSettings[s.key] = s.value;
    });

    const mode = (dbSettings['stripe_mode'] as 'test' | 'live') || 'test';

    let secretKey: string;
    if (mode === 'live') {
      secretKey = dbSettings['stripe_live_secret_key'] || process.env.STRIPE_SECRET_KEY || '';
    } else {
      secretKey = dbSettings['stripe_test_secret_key'] || process.env.STRIPE_SECRET_KEY || '';
    }

    const webhookSecret = dbSettings['stripe_webhook_secret'] || process.env.STRIPE_WEBHOOK_SECRET || '';

    return { secretKey, webhookSecret };
  } catch {
    return {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    };
  }
}

/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events for payments and subscriptions
 */
export async function POST(request: NextRequest) {
  const config = await loadStripeConfig();

  if (!config.secretKey || !config.webhookSecret) {
    console.error('Stripe not configured');
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const stripe = new Stripe(config.secretKey);
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, config.webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('Stripe webhook event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
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
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

/**
 * Handle checkout.session.completed - one-time payments via checkout
 */
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  console.log('Checkout session completed:', session.id);

  // For subscriptions, invoice.payment_succeeded handles it
  if (session.mode === 'subscription') {
    console.log('Subscription checkout completed, waiting for invoice.payment_succeeded');
    return;
  }

  // Handle one-time payments
  if (session.mode === 'payment' && session.payment_status === 'paid') {
    const metadata = session.metadata || {};
    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

    const isGuest = metadata.isGuest === 'true' || !session.client_reference_id;

    await processDonation({
      userId: isGuest ? undefined : parseInt(session.client_reference_id || '0'),
      guestName: isGuest ? (metadata.guestName || 'Anonymous') : undefined,
      minecraftUsername: isGuest ? metadata.guestMinecraftUsername : undefined,
      amount: (session.amount_total || 0) / 100,
      currency: session.currency?.toUpperCase() || 'USD',
      method: 'stripe',
      paymentType: 'one_time',
      transactionId: paymentIntentId || `checkout_${session.id}`,
      rankId: metadata.rankId !== 'one-time' ? metadata.rankId : undefined,
      days: parseInt(metadata.days || '0'),
    });
  }
}

/**
 * Handle invoice.payment_succeeded - subscription payments
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, stripe: Stripe) {
  const subscriptionId = (invoice as any).subscription as string;
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const metadata = subscription.metadata;
  const userId = metadata?.userId;
  const rankId = metadata?.rankId;
  const days = Number(metadata?.days || 30);

  if (!userId || !rankId) {
    console.error('Missing metadata in subscription');
    return;
  }

  const isFirstPayment = invoice.billing_reason === 'subscription_create';
  const paymentIntentId = (invoice as any).payment_intent as string;

  const result = await processDonation({
    userId: parseInt(userId),
    amount: (invoice.amount_paid || 0) / 100,
    currency: invoice.currency?.toUpperCase() || 'USD',
    method: 'stripe',
    paymentType: isFirstPayment ? 'subscription' : 'subscription_renewal',
    transactionId: paymentIntentId,
    subscriptionId,
    rankId,
    days,
    invoiceId: invoice.id,
    invoiceUrl: invoice.hosted_invoice_url || undefined,
  });

  if (result.success) {
    // Update stripe subscription ID on user
    await db
      .update(users)
      .set({ stripeSubscriptionId: subscriptionId })
      .where(eq(users.id, parseInt(userId)));
  }
}

/**
 * Handle invoice.payment_failed - subscription payment failures
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, stripe: Stripe) {
  const subscriptionId = (invoice as any).subscription as string;
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  console.log(`⚠️ Payment failed for user ${userId}, subscription ${subscriptionId}`);

  await db
    .update(users)
    .set({ subscriptionStatus: 'past_due', updatedAt: new Date() })
    .where(eq(users.id, Number(userId)));

  // Cancel after 3 failed attempts
  if ((invoice.attempt_count || 0) >= 3) {
    console.log(`❌ Max retry attempts reached for user ${userId}, canceling subscription`);
    try {
      await stripe.subscriptions.cancel(subscriptionId);
    } catch (err) {
      console.error('Error canceling subscription:', err);
    }
  }
}

/**
 * Handle customer.subscription.deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  const wasImmediateCancellation = subscription.canceled_at && subscription.ended_at
    && subscription.canceled_at === subscription.ended_at;

  if (wasImmediateCancellation) {
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

/**
 * Handle customer.subscription.updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

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
    .set({ subscriptionStatus: status, updatedAt: new Date() })
    .where(eq(users.id, Number(userId)));
}

/**
 * Handle payment_intent.succeeded - one-time payments via Elements
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const metadata = paymentIntent.metadata || {};
  const userId = metadata.userId;

  if (!userId) {
    console.log('Missing userId in payment_intent metadata, skipping');
    return;
  }

  await processDonation({
    userId: parseInt(userId),
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency?.toUpperCase() || 'USD',
    method: 'stripe',
    paymentType: 'one_time',
    transactionId: paymentIntent.id,
    rankId: metadata.rankId !== 'one-time' ? metadata.rankId : undefined,
    days: parseInt(metadata.days || '0'),
  });
}
