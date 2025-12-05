/**
 * Settings Helper
 * Load and manage site settings from database
 */

import { db } from '@/db';
import { siteSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Cache settings in memory for performance
let settingsCache: Record<string, string> = {};
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Get a setting value from database
 */
export async function getSetting(key: string, defaultValue: string = ''): Promise<string> {
  try {
    // Check cache first
    const now = Date.now();
    if (settingsCache[key] && now - cacheTimestamp < CACHE_TTL) {
      return settingsCache[key];
    }

    const [setting] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, key))
      .limit(1);

    const value = setting?.value || defaultValue;
    
    // Update cache
    settingsCache[key] = value;
    cacheTimestamp = now;

    return value;
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Get multiple settings at once
 */
export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  try {
    const settings = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, keys[0])); // SQLite limitation workaround

    const result: Record<string, string> = {};
    settings.forEach(setting => {
      if (keys.includes(setting.key)) {
        result[setting.key] = setting.value || '';
      }
    });

    return result;
  } catch (error) {
    console.error('Error getting settings:', error);
    return {};
  }
}

/**
 * Get all settings by category
 */
export async function getSettingsByCategory(category: string): Promise<Record<string, string>> {
  try {
    const settings = await db.select().from(siteSettings);

    const result: Record<string, string> = {};
    settings
      .filter(s => s.category === category)
      .forEach(setting => {
        result[setting.key] = setting.value || '';
      });

    return result;
  } catch (error) {
    console.error(`Error getting settings for category ${category}:`, error);
    return {};
  }
}

/**
 * Set a setting value
 */
export async function setSetting(key: string, value: string): Promise<void> {
  try {
    await db
      .update(siteSettings)
      .set({
        value,
        updatedAt: new Date(),
      })
      .where(eq(siteSettings.key, key));

    // Clear cache
    delete settingsCache[key];
  } catch (error) {
    console.error(`Error setting ${key}:`, error);
  }
}

/**
 * Get Stripe configuration from database or environment
 */
export async function getStripeConfig() {
  try {
    const dbSettings = await getSettingsByCategory('payments');
    
    return {
      secretKey: dbSettings.stripe_secret_key || process.env.STRIPE_SECRET_KEY || '',
      publishableKey: dbSettings.stripe_publishable_key || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
      webhookSecret: dbSettings.stripe_webhook_secret || process.env.STRIPE_WEBHOOK_SECRET || '',
      enabled: dbSettings.payment_provider === 'stripe' || process.env.PAYMENT_PROVIDER === 'stripe',
    };
  } catch {
    return {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      enabled: process.env.PAYMENT_PROVIDER === 'stripe',
    };
  }
}

/**
 * Clear settings cache
 */
export function clearSettingsCache() {
  settingsCache = {};
  cacheTimestamp = 0;
}
