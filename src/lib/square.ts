/**
 * Square Integration
 * 
 * Server-side Square utilities for payment processing
 * Keys are loaded from database (admin dashboard) first, with environment variables as fallback
 */

import { Client, Environment } from 'square';
import { db } from '@/db';
import { siteSettings } from '@/db/schema';
import { like } from 'drizzle-orm';
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
        settings.forEach(s => {
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
    } catch (error) {
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
    } catch (error) {
        console.error('Error verifying Square webhook signature:', error);
        return false;
    }
}

/**
 * Create a checkout link for one-time payment
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

    // Create a payment link using Square Checkout API
    const response = await client.checkoutApi.createPaymentLink({
        idempotencyKey: `vonix-${userId}-${Date.now()}`,
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
        checkoutOptions: {
            redirectUrl,
            merchantSupportEmail: customerEmail,
        },
        prePopulatedData: customerEmail ? {
            buyerEmail: customerEmail,
        } : undefined,
    });

    if (!response.result.paymentLink?.url || !response.result.paymentLink?.orderId) {
        throw new Error('Failed to create Square checkout link');
    }

    return {
        checkoutUrl: response.result.paymentLink.url,
        orderId: response.result.paymentLink.orderId,
    };
}
