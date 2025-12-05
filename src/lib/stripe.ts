/**
 * Stripe Integration
 * 
 * Server-side Stripe utilities for payment processing
 * Auto-creates products and prices for ranks when needed
 * 
 * Keys are loaded from database (admin dashboard) first, with environment variables as fallback
 */

import Stripe from 'stripe';
import { db } from '@/db';
import { donationRanks, siteSettings } from '@/db/schema';
import { eq, like } from 'drizzle-orm';

let stripeInstance: Stripe | null = null;
let stripeConfigCache: {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  mode: 'test' | 'live';
} | null = null;
let configCacheTimestamp = 0;
const CONFIG_CACHE_TTL = 60000; // 1 minute

/**
 * Load Stripe configuration from database, with env vars as fallback
 */
async function loadStripeConfig(): Promise<{
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  mode: 'test' | 'live';
}> {
  const now = Date.now();

  // Return cached config if still valid
  if (stripeConfigCache && now - configCacheTimestamp < CONFIG_CACHE_TTL) {
    return stripeConfigCache;
  }

  try {
    // Fetch all payment settings from database
    const settings = await db
      .select()
      .from(siteSettings)
      .where(like(siteSettings.key, 'stripe_%'));

    const dbSettings: Record<string, string> = {};
    settings.forEach(s => {
      if (s.value) dbSettings[s.key] = s.value;
    });

    // Determine mode (test or live)
    const mode = (dbSettings['stripe_mode'] as 'test' | 'live') || 'test';

    // Get keys based on mode - database values override env vars
    let secretKey: string;
    let publishableKey: string;

    if (mode === 'live') {
      secretKey = dbSettings['stripe_live_secret_key'] || process.env.STRIPE_SECRET_KEY || '';
      publishableKey = dbSettings['stripe_live_publishable_key'] || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
    } else {
      secretKey = dbSettings['stripe_test_secret_key'] || process.env.STRIPE_SECRET_KEY || '';
      publishableKey = dbSettings['stripe_test_publishable_key'] || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
    }

    const webhookSecret = dbSettings['stripe_webhook_secret'] || process.env.STRIPE_WEBHOOK_SECRET || '';

    stripeConfigCache = { secretKey, publishableKey, webhookSecret, mode };
    configCacheTimestamp = now;

    return stripeConfigCache;
  } catch (error) {
    console.error('Error loading Stripe config from database, falling back to env vars:', error);

    // Fallback to environment variables
    return {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      mode: 'test',
    };
  }
}

/**
 * Get Stripe instance - loads keys from database first
 */
export async function getStripeAsync(): Promise<Stripe> {
  const config = await loadStripeConfig();

  if (!config.secretKey) {
    throw new Error('Stripe secret key is not configured. Please set it in the admin dashboard under Settings > Payments.');
  }

  // Create new instance if config changed or doesn't exist
  if (!stripeInstance) {
    stripeInstance = new Stripe(config.secretKey, {
      typescript: true,
    });
  }

  return stripeInstance;
}

/**
 * Synchronous getter for Stripe - uses cached config
 * Falls back to env vars if no cached config exists
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    // Use cached config if available, otherwise fall back to env vars
    const secretKey = stripeConfigCache?.secretKey || process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new Error('Stripe secret key is not configured. Please set it in the admin dashboard under Settings > Payments.');
    }

    stripeInstance = new Stripe(secretKey, {
      typescript: true,
    });
  }

  return stripeInstance;
}

/**
 * Check if Stripe is properly configured
 */
export async function isStripeConfigured(): Promise<boolean> {
  try {
    const config = await loadStripeConfig();
    return !!(config.secretKey && config.publishableKey && config.webhookSecret);
  } catch {
    return false;
  }
}

/**
 * Synchronous check if Stripe is configured (uses cache or env vars)
 */
export function isStripeConfiguredSync(): boolean {
  if (stripeConfigCache) {
    return !!(stripeConfigCache.secretKey && stripeConfigCache.publishableKey && stripeConfigCache.webhookSecret);
  }
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

/**
 * Get the current Stripe mode (test or live)
 */
export async function getStripeMode(): Promise<'test' | 'live'> {
  const config = await loadStripeConfig();
  return config.mode;
}

/**
 * Get the publishable key for client-side usage
 */
export async function getPublishableKey(): Promise<string> {
  const config = await loadStripeConfig();
  return config.publishableKey;
}

/**
 * Get webhook secret for verifying webhooks
 */
export async function getWebhookSecret(): Promise<string> {
  const config = await loadStripeConfig();
  return config.webhookSecret;
}

/**
 * Clear the Stripe config cache (call when settings are updated)
 */
export function clearStripeConfigCache(): void {
  stripeConfigCache = null;
  configCacheTimestamp = 0;
  stripeInstance = null;
}

/**
 * Get or create a Stripe Product for a donation rank
 */
export async function getOrCreateProduct(rank: {
  id: string;
  name: string;
  color: string;
  minAmount: number;
  stripeProductId?: string | null;
}): Promise<string> {
  const stripe = getStripe();

  // If product already exists, verify it's still valid in Stripe
  if (rank.stripeProductId) {
    try {
      const product = await stripe.products.retrieve(rank.stripeProductId);
      if (product && !product.deleted) {
        return rank.stripeProductId;
      }
    } catch (error) {
      console.log(`Product ${rank.stripeProductId} not found in Stripe, creating new one`);
    }
  }

  // Create new product
  const product = await stripe.products.create({
    name: `${rank.name} Rank`,
    description: `Vonix Network ${rank.name} donor rank with exclusive perks`,
    metadata: {
      rankId: rank.id,
      type: 'donor_rank',
    },
  });

  // Update database with new product ID
  await db
    .update(donationRanks)
    .set({ stripeProductId: product.id, updatedAt: new Date() })
    .where(eq(donationRanks.id, rank.id));

  console.log(`Created Stripe product ${product.id} for rank ${rank.id}`);
  return product.id;
}

/**
 * Get or create a Stripe Price for a subscription
 */
export async function getOrCreatePrice(
  productId: string,
  rank: {
    id: string;
    name: string;
    minAmount: number;
    stripePriceMonthly?: string | null;
    stripePriceQuarterly?: string | null;
    stripePriceSemiannual?: string | null;
    stripePriceYearly?: string | null;
  },
  interval: 'month' | 'quarter' | 'semiannual' | 'year' = 'month'
): Promise<string> {
  const stripe = getStripe();

  // Map interval to database field and actual Stripe interval
  const intervalMap = {
    month: { field: 'stripePriceMonthly', stripeInterval: 'month' as const, count: 1, multiplier: 1 },
    quarter: { field: 'stripePriceQuarterly', stripeInterval: 'month' as const, count: 3, multiplier: 2.7 },
    semiannual: { field: 'stripePriceSemiannual', stripeInterval: 'month' as const, count: 6, multiplier: 5 },
    year: { field: 'stripePriceYearly', stripeInterval: 'year' as const, count: 1, multiplier: 10 },
  };

  const config = intervalMap[interval];
  const existingPriceId = rank[config.field as keyof typeof rank] as string | null;

  // Check if price exists in Stripe
  if (existingPriceId) {
    try {
      const price = await stripe.prices.retrieve(existingPriceId);
      if (price && price.active) {
        return existingPriceId;
      }
    } catch (error) {
      console.log(`Price ${existingPriceId} not found in Stripe, creating new one`);
    }
  }

  // Calculate price based on interval and base monthly amount
  const amountInCents = Math.round(rank.minAmount * config.multiplier * 100);

  // Create new price
  const priceParams: Stripe.PriceCreateParams = {
    product: productId,
    currency: 'usd',
    unit_amount: amountInCents,
    recurring: {
      interval: config.stripeInterval,
      interval_count: config.count,
    },
    metadata: {
      rankId: rank.id,
      billingPeriod: interval,
    },
  };

  const price = await stripe.prices.create(priceParams);

  // Update database with new price ID
  const updateData: Record<string, any> = { updatedAt: new Date() };
  updateData[config.field] = price.id;

  await db
    .update(donationRanks)
    .set(updateData)
    .where(eq(donationRanks.id, rank.id));

  console.log(`Created Stripe price ${price.id} for rank ${rank.id} (${interval})`);
  return price.id;
}

/**
 * Ensure a rank has all necessary Stripe products and prices
 * Returns the price ID for the requested billing period
 */
export async function ensureRankStripeSetup(
  rank: {
    id: string;
    name: string;
    color: string;
    minAmount: number;
    stripeProductId?: string | null;
    stripePriceMonthly?: string | null;
    stripePriceQuarterly?: string | null;
    stripePriceSemiannual?: string | null;
    stripePriceYearly?: string | null;
  },
  billingPeriod: 'monthly' | 'quarterly' | 'semiannual' | 'yearly' = 'monthly'
): Promise<string> {
  // First ensure product exists
  const productId = await getOrCreateProduct(rank);

  // Map billing period to interval
  const intervalMap = {
    monthly: 'month' as const,
    quarterly: 'quarter' as const,
    semiannual: 'semiannual' as const,
    yearly: 'year' as const,
  };

  // Get or create the price for the requested billing period
  const priceId = await getOrCreatePrice(productId, rank, intervalMap[billingPeriod]);

  return priceId;
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
