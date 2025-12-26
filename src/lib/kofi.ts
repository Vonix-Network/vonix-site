/**
 * Ko-Fi Integration
 * 
 * Server-side Ko-Fi utilities for webhook verification and payment processing
 * Keys are loaded from database (admin dashboard)
 */

import { db } from '@/db';
import { siteSettings } from '@/db/schema';
import { like } from 'drizzle-orm';

// Cache for Ko-Fi config
let kofiConfigCache: {
    verificationToken: string;
    pageUrl: string;
} | null = null;
let configCacheTimestamp = 0;
const CONFIG_CACHE_TTL = 60000; // 1 minute

/**
 * Load Ko-Fi configuration from database
 */
export async function loadKofiConfig(): Promise<{
    verificationToken: string;
    pageUrl: string;
}> {
    const now = Date.now();

    // Return cached config if still valid
    if (kofiConfigCache && now - configCacheTimestamp < CONFIG_CACHE_TTL) {
        return kofiConfigCache;
    }

    try {
        // Fetch all Ko-Fi settings from database
        const settings = await db
            .select()
            .from(siteSettings)
            .where(like(siteSettings.key, 'kofi_%'));

        const dbSettings: Record<string, string> = {};
        settings.forEach((s: any) => {
            if (s.value) dbSettings[s.key] = s.value;
        });

        kofiConfigCache = {
            verificationToken: dbSettings['kofi_verification_token'] || '',
            pageUrl: dbSettings['kofi_page_url'] || '',
        };
        configCacheTimestamp = now;

        return kofiConfigCache;
    } catch (error: any) {
        console.error('Error loading Ko-Fi config from database:', error);
        return {
            verificationToken: '',
            pageUrl: '',
        };
    }
}

/**
 * Check if Ko-Fi is properly configured
 */
export async function isKofiConfigured(): Promise<boolean> {
    try {
        const config = await loadKofiConfig();
        return !!(config.verificationToken && config.pageUrl);
    } catch {
        return false;
    }
}

/**
 * Get the current payment provider from settings
 */
export async function getPaymentProvider(): Promise<'stripe' | 'kofi' | 'square' | 'disabled'> {
    try {
        const settings = await db
            .select()
            .from(siteSettings)
            .where(like(siteSettings.key, 'payment_provider'));

        if (settings.length > 0 && settings[0].value) {
            const provider = settings[0].value;
            if (provider === 'stripe' || provider === 'kofi' || provider === 'square' || provider === 'disabled') {
                return provider;
            }
        }
        return 'stripe'; // Default to Stripe
    } catch {
        return 'stripe';
    }
}

/**
 * Verify Ko-Fi webhook token
 */
export async function verifyKofiToken(providedToken: string): Promise<boolean> {
    const config = await loadKofiConfig();
    if (!config.verificationToken) {
        return false;
    }
    return config.verificationToken === providedToken;
}

/**
 * Clear the Ko-Fi config cache (call after settings update)
 */
export function clearKofiConfigCache(): void {
    kofiConfigCache = null;
    configCacheTimestamp = 0;
}

/**
 * Get Ko-Fi page URL for redirecting users
 */
export async function getKofiPageUrl(): Promise<string> {
    const config = await loadKofiConfig();
    return config.pageUrl;
}
