/**
 * Stripe Integration
 * 
 * Server-side Stripe utilities for payment processing
 */

import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2025-10-29.clover',
      typescript: true,
    });
  }
  
  return stripeInstance;
}

export function isStripeConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

/**
 * Create a Stripe Checkout Session for one-time payment
 */
export async function createCheckoutSession({
  userId,
  rankId,
  rankName,
  amount,
  days,
  customerEmail,
  successUrl,
  cancelUrl,
}: {
  userId: number;
  rankId: string;
  rankName: string;
  amount: number;
  days: number;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: customerEmail,
    client_reference_id: userId.toString(),
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${rankName} Rank`,
            description: `${days} days of ${rankName} rank benefits`,
          },
          unit_amount: Math.round(amount * 100), // Convert to cents
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: userId.toString(),
      rankId,
      rankName,
      days: days.toString(),
      type: 'one_time',
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  
  return session;
}

/**
 * Create a Stripe Checkout Session for subscription
 */
export async function createSubscriptionCheckout({
  userId,
  rankId,
  rankName,
  priceId,
  days,
  customerEmail,
  successUrl,
  cancelUrl,
}: {
  userId: number;
  rankId: string;
  rankName: string;
  priceId: string;
  days: number;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: customerEmail,
    client_reference_id: userId.toString(),
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      metadata: {
        userId: userId.toString(),
        rankId,
        rankName,
        days: days.toString(),
      },
    },
    metadata: {
      userId: userId.toString(),
      rankId,
      rankName,
      days: days.toString(),
      type: 'subscription',
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  
  return session;
}

/**
 * Create a Customer Portal session for managing subscriptions
 */
export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe();
  
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  
  return session;
}

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateCustomer({
  userId,
  email,
  username,
}: {
  userId: number;
  email?: string;
  username: string;
}): Promise<string> {
  const stripe = getStripe();
  
  // Search for existing customer
  if (email) {
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });
    
    if (customers.data.length > 0) {
      return customers.data[0].id;
    }
  }
  
  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name: username,
    metadata: {
      userId: userId.toString(),
    },
  });
  
  return customer.id;
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  
  if (immediately) {
    return stripe.subscriptions.cancel(subscriptionId);
  }
  
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }
  
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
