/**
 * Square Integration
 * 
 * Server-side Square utilities for payment processing
 * Keys are loaded from database (admin dashboard) first, with environment variables as fallback
 */

import { Client, Environment } from 'square';
import { db } from '@/db';
import { siteSettings, users, donationRanks } from '@/db/schema';
import { like, eq } from 'drizzle-orm';
import crypto from 'crypto';

let squareClientInstance: Client | null = null;
let squareConfigCache: {
    accessToken: string;
    applicationId: string;
    webhookSignatureKey: string;
    locationId: string;
    mode: 'sandbox' | 'production';
} | null = null;
let configCacheTimestamp = 0;
const CONFIG_CACHE_TTL = 60000; // 1 minute

/**
 * Load Square configuration from database, with env vars as fallback
 */
export async function loadSquareConfig(): Promise<{
    accessToken: string;
    applicationId: string;
    webhookSignatureKey: string;
    locationId: string;
    mode: 'sandbox' | 'production';
}> {
    const now = Date.now();

    // Return cached config if still valid
    if (squareConfigCache && now - configCacheTimestamp < CONFIG_CACHE_TTL) {
        return squareConfigCache;
    }

    try {
        // Fetch all Square settings from database
        const settings = await db
            .select()
            .from(siteSettings)
            .where(like(siteSettings.key, 'square_%'));

        const dbSettings: Record<string, string> = {};
        settings.forEach((s: any) => {
            if (s.value) dbSettings[s.key] = s.value;
        });

        // Determine mode (sandbox or production)
        const mode = (dbSettings['square_mode'] as 'sandbox' | 'production') || 'sandbox';

        // Get keys based on mode - database values override env vars
        let accessToken: string;
        let applicationId: string;

        if (mode === 'production') {
            accessToken = dbSettings['square_production_access_token'] || process.env.SQUARE_ACCESS_TOKEN || '';
            applicationId = dbSettings['square_production_application_id'] || process.env.SQUARE_APPLICATION_ID || '';
        } else {
            accessToken = dbSettings['square_sandbox_access_token'] || process.env.SQUARE_ACCESS_TOKEN || '';
            applicationId = dbSettings['square_sandbox_application_id'] || process.env.SQUARE_APPLICATION_ID || '';
        }

        const webhookSignatureKey = dbSettings['square_webhook_signature_key'] || process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || '';
        const locationId = dbSettings['square_location_id'] || process.env.SQUARE_LOCATION_ID || '';

        squareConfigCache = { accessToken, applicationId, webhookSignatureKey, locationId, mode };
        configCacheTimestamp = now;

        return squareConfigCache;
    } catch (error: any) {
        console.error('Error loading Square config from database, falling back to env vars:', error);

        // Fallback to environment variables
        return {
            accessToken: process.env.SQUARE_ACCESS_TOKEN || '',
            applicationId: process.env.SQUARE_APPLICATION_ID || '',
            webhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || '',
            locationId: process.env.SQUARE_LOCATION_ID || '',
            mode: 'sandbox',
        };
    }
}

/**
 * Get Square client instance - loads keys from database first
 */
export async function getSquareClient(): Promise<Client> {
    const config = await loadSquareConfig();

    if (!config.accessToken) {
        throw new Error('Square access token is not configured. Please set it in the admin dashboard under Settings > Payments.');
    }

    // Create new instance if config changed or doesn't exist
    if (!squareClientInstance) {
        squareClientInstance = new Client({
            accessToken: config.accessToken,
            environment: config.mode === 'production' ? Environment.Production : Environment.Sandbox,
        });
    }

    return squareClientInstance;
}

/**
 * Get synchronous Square client - uses cached config
 */
export function getSquareClientSync(): Client {
    if (!squareClientInstance) {
        const accessToken = squareConfigCache?.accessToken || process.env.SQUARE_ACCESS_TOKEN;

        if (!accessToken) {
            throw new Error('Square access token is not configured. Please set it in the admin dashboard under Settings > Payments.');
        }

        const mode = squareConfigCache?.mode || 'sandbox';
        squareClientInstance = new Client({
            accessToken,
            environment: mode === 'production' ? Environment.Production : Environment.Sandbox,
        });
    }

    return squareClientInstance;
}

/**
 * Generate a short idempotency key that fits Square's 45-char limit
 * Format: prefix-uuid (e.g., "ord-a1b2c3d4-e5f6-7890-abcd-ef1234567890")
 */
function generateIdempotencyKey(prefix: string): string {
    const uuid = crypto.randomUUID();
    // Keep prefix short (max 4 chars) + hyphen + 36 char UUID = 41 chars max
    const shortPrefix = prefix.substring(0, 4);
    return `${shortPrefix}-${uuid}`;
}

/**
 * Check if Square is properly configured
 */
export async function isSquareConfigured(): Promise<boolean> {
    try {
        const config = await loadSquareConfig();
        return !!(config.accessToken && config.applicationId && config.locationId);
    } catch {
        return false;
    }
}

/**
 * Synchronous check if Square is configured (uses cache or env vars)
 */
export function isSquareConfiguredSync(): boolean {
    if (squareConfigCache) {
        return !!(squareConfigCache.accessToken && squareConfigCache.applicationId && squareConfigCache.locationId);
    }
    return !!(
        process.env.SQUARE_ACCESS_TOKEN &&
        process.env.SQUARE_APPLICATION_ID &&
        process.env.SQUARE_LOCATION_ID
    );
}

/**
 * Get the current Square mode (sandbox or production)
 */
export async function getSquareMode(): Promise<'sandbox' | 'production'> {
    const config = await loadSquareConfig();
    return config.mode;
}

/**
 * Get the application ID for client-side usage
 */
export async function getApplicationId(): Promise<string> {
    const config = await loadSquareConfig();
    return config.applicationId;
}

/**
 * Get location ID
 */
export async function getLocationId(): Promise<string> {
    const config = await loadSquareConfig();
    return config.locationId;
}

/**
 * Get webhook signature key for verifying webhooks
 */
export async function getWebhookSignatureKey(): Promise<string> {
    const config = await loadSquareConfig();
    return config.webhookSignatureKey;
}

/**
 * Clear the Square config cache (call when settings are updated)
 */
export function clearSquareConfigCache(): void {
    squareConfigCache = null;
    configCacheTimestamp = 0;
    squareClientInstance = null;
}

/**
 * Verify Square webhook signature
 * Square uses HMAC-SHA256 for webhook signature verification
 */
export async function verifyWebhookSignature(
    payload: string,
    signature: string,
    url: string
): Promise<boolean> {
    const signatureKey = await getWebhookSignatureKey();

    if (!signatureKey) {
        console.error('Square webhook signature key is not configured');
        return false;
    }

    try {
        // Square signature format: the signature is an HMAC-SHA256 hash of:
        // URL + body, using the webhook signature key
        const stringToSign = url + payload;
        const expectedSignature = crypto
            .createHmac('sha256', signatureKey)
            .update(stringToSign)
            .digest('base64');

        // Compare signatures (timing-safe)
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch (error: any) {
        console.error('Error verifying Square webhook signature:', error);
        return false;
    }
}

/**
 * Create a checkout link for one-time payment
 * Note: Since Payment Links API may not be available in sandbox,
 * we create an order and return the order ID for client-side payment processing
 */
export async function createCheckoutLink({
    userId,
    rankId,
    rankName,
    amount,
    days,
    customerEmail,
    redirectUrl,
}: {
    userId: number;
    rankId: string;
    rankName: string;
    amount: number; // in dollars
    days: number;
    customerEmail?: string;
    redirectUrl: string;
}): Promise<{ checkoutUrl: string; orderId: string }> {
    const client = await getSquareClient();
    const config = await loadSquareConfig();

    const amountInCents = Math.round(amount * 100);

    // Create an order
    const orderResponse = await client.ordersApi.createOrder({
        order: {
            locationId: config.locationId,
            lineItems: [
                {
                    name: `${rankName} Rank`,
                    quantity: '1',
                    basePriceMoney: {
                        amount: BigInt(amountInCents),
                        currency: 'USD',
                    },
                    note: `${days} days of ${rankName} rank benefits`,
                },
            ],
            metadata: {
                userId: userId.toString(),
                rankId,
                rankName,
                days: days.toString(),
                type: 'one_time',
            },
        },
        idempotencyKey: generateIdempotencyKey('ord'),
    });

    if (!orderResponse.result.order?.id) {
        throw new Error('Failed to create Square order');
    }

    const orderId = orderResponse.result.order.id;

    // Since Payment Links API isn't available in sandbox,
    // return a URL that will load Square Web Payments SDK on the client
    // The donate page will handle this by showing a payment form
    const checkoutUrl = `${redirectUrl}?orderId=${orderId}&provider=square&amount=${amount}`;

    console.log(`Created Square order ${orderId} for ${rankName} rank`);

    return {
        checkoutUrl,
        orderId,
    };
}

// ===================================
// CUSTOMER MANAGEMENT
// ===================================

/**
 * Get or create a Square customer for a user
 */
export async function getOrCreateSquareCustomer(
    userId: number,
    email: string,
    displayName?: string
): Promise<string> {
    const client = await getSquareClient();

    // Check if user already has a Square customer ID
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    if (user?.squareCustomerId) {
        // Verify customer still exists in Square
        try {
            await client.customersApi.retrieveCustomer(user.squareCustomerId);
            return user.squareCustomerId;
        } catch {
            console.log(`Square customer ${user.squareCustomerId} not found, creating new one`);
        }
    }

    // Create new Square customer
    const response = await client.customersApi.createCustomer({
        idempotencyKey: generateIdempotencyKey('cust'),
        emailAddress: email,
        referenceId: userId.toString(),
        givenName: displayName || user?.username || undefined,
    });

    if (!response.result.customer?.id) {
        throw new Error('Failed to create Square customer');
    }

    // Store customer ID in database
    await db
        .update(users)
        .set({ squareCustomerId: response.result.customer.id, updatedAt: new Date() })
        .where(eq(users.id, userId));

    console.log(`Created Square customer ${response.result.customer.id} for user ${userId}`);
    return response.result.customer.id;
}

/**
 * Save a card on file for a customer (from a nonce)
 */
export async function saveCardOnFile(
    customerId: string,
    sourceId: string // This is the card nonce from Web Payments SDK
): Promise<string> {
    const client = await getSquareClient();

    const response = await client.cardsApi.createCard({
        idempotencyKey: generateIdempotencyKey('card'),
        sourceId,
        card: {
            customerId,
        },
    });

    if (!response.result.card?.id) {
        throw new Error('Failed to save card on file');
    }

    return response.result.card.id;
}

// ===================================
// CATALOG / SUBSCRIPTION PLANS
// ===================================

/**
 * Get or create a subscription plan for a rank
 */
export async function getOrCreateSubscriptionPlan(rank: {
    id: string;
    name: string;
    squareSubscriptionPlanId?: string | null;
}): Promise<string> {
    const client = await getSquareClient();

    // Check if rank already has a Square plan ID
    if (rank.squareSubscriptionPlanId) {
        try {
            const existing = await client.catalogApi.retrieveCatalogObject(rank.squareSubscriptionPlanId);
            if (existing.result.object) {
                return rank.squareSubscriptionPlanId;
            }
        } catch {
            console.log(`Square plan ${rank.squareSubscriptionPlanId} not found, creating new one`);
        }
    }

    // Create new subscription plan in Square Catalog
    const response = await client.catalogApi.upsertCatalogObject({
        idempotencyKey: generateIdempotencyKey('plan'),
        object: {
            type: 'SUBSCRIPTION_PLAN',
            id: `#vonix-plan-${rank.id}`,
            subscriptionPlanData: {
                name: `${rank.name} Rank Subscription`,
                eligibleItemIds: [], // We're not selling catalog items, just subscriptions
                allItems: false,
            },
            presentAtAllLocations: true,
        },
    });

    if (!response.result.catalogObject?.id) {
        throw new Error('Failed to create Square subscription plan');
    }

    const planId = response.result.catalogObject.id;

    // Update rank in database
    await db
        .update(donationRanks)
        .set({ squareSubscriptionPlanId: planId, updatedAt: new Date() })
        .where(eq(donationRanks.id, rank.id));

    console.log(`Created Square subscription plan ${planId} for rank ${rank.id}`);
    return planId;
}

/**
 * Get or create a subscription plan variation (monthly pricing)
 */
export async function getOrCreateSubscriptionPlanVariation(
    planId: string,
    rank: {
        id: string;
        name: string;
        minAmount: number; // Monthly price in dollars
        squareSubscriptionPlanVariationId?: string | null;
    }
): Promise<string> {
    const client = await getSquareClient();

    // Check if rank already has a variation ID
    if (rank.squareSubscriptionPlanVariationId) {
        try {
            const existing = await client.catalogApi.retrieveCatalogObject(rank.squareSubscriptionPlanVariationId);
            if (existing.result.object) {
                return rank.squareSubscriptionPlanVariationId;
            }
        } catch {
            console.log(`Square variation ${rank.squareSubscriptionPlanVariationId} not found, creating new one`);
        }
    }

    const amountInCents = Math.round(rank.minAmount * 100);

    // Create subscription plan variation with monthly billing
    const response = await client.catalogApi.upsertCatalogObject({
        idempotencyKey: generateIdempotencyKey('var'),
        object: {
            type: 'SUBSCRIPTION_PLAN_VARIATION',
            id: `#vonix-variation-${rank.id}`,
            subscriptionPlanVariationData: {
                name: `${rank.name} Monthly`,
                subscriptionPlanId: planId,
                phases: [
                    {
                        cadence: 'MONTHLY',
                        pricing: {
                            type: 'STATIC',
                            priceMoney: {
                                amount: BigInt(amountInCents),
                                currency: 'USD',
                            },
                        },
                    },
                ],
            },
            presentAtAllLocations: true,
        },
    });

    if (!response.result.catalogObject?.id) {
        throw new Error('Failed to create Square subscription plan variation');
    }

    const variationId = response.result.catalogObject.id;

    // Update rank in database
    await db
        .update(donationRanks)
        .set({ squareSubscriptionPlanVariationId: variationId, updatedAt: new Date() })
        .where(eq(donationRanks.id, rank.id));

    console.log(`Created Square subscription variation ${variationId} for rank ${rank.id}`);
    return variationId;
}

/**
 * Ensure a rank has all necessary Square subscription plan and variation
 */
export async function ensureRankSquareSetup(rank: {
    id: string;
    name: string;
    minAmount: number;
    squareSubscriptionPlanId?: string | null;
    squareSubscriptionPlanVariationId?: string | null;
}): Promise<{ planId: string; variationId: string }> {
    // First ensure plan exists
    const planId = await getOrCreateSubscriptionPlan(rank);

    // Then ensure variation exists
    const variationId = await getOrCreateSubscriptionPlanVariation(planId, {
        id: rank.id,
        name: rank.name,
        minAmount: rank.minAmount,
        squareSubscriptionPlanVariationId: rank.squareSubscriptionPlanVariationId,
    });

    return { planId, variationId };
}

// ===================================
// SUBSCRIPTION MANAGEMENT
// ===================================

/**
 * Create a subscription for a customer
 */
export async function createSquareSubscription({
    customerId,
    planVariationId,
    cardId,
    userId,
    rankId,
}: {
    customerId: string;
    planVariationId: string;
    cardId: string;
    userId: number;
    rankId: string;
}): Promise<string> {
    const client = await getSquareClient();
    const config = await loadSquareConfig();

    const response = await client.subscriptionsApi.createSubscription({
        idempotencyKey: generateIdempotencyKey('sub'),
        locationId: config.locationId,
        customerId,
        planVariationId,
        cardId,
        source: {
            name: 'Vonix Network Website',
        },
    });

    if (!response.result.subscription?.id) {
        throw new Error('Failed to create Square subscription');
    }

    const subscriptionId = response.result.subscription.id;

    // Update user with subscription info
    await db
        .update(users)
        .set({
            squareSubscriptionId: subscriptionId,
            squareCardId: cardId,
            subscriptionStatus: 'active',
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

    console.log(`Created Square subscription ${subscriptionId} for user ${userId}`);
    return subscriptionId;
}

/**
 * Cancel a Square subscription
 */
export async function cancelSquareSubscription(subscriptionId: string): Promise<void> {
    const client = await getSquareClient();

    await client.subscriptionsApi.cancelSubscription(subscriptionId);
    console.log(`Canceled Square subscription ${subscriptionId}`);
}

/**
 * Retrieve subscription details
 */
export async function getSquareSubscription(subscriptionId: string) {
    const client = await getSquareClient();
    const response = await client.subscriptionsApi.retrieveSubscription(subscriptionId);
    return response.result.subscription;
}
