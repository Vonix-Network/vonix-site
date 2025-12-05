/**
 * Payment System Configuration
 * Unified payment provider support for Stripe and Square
 */

export type PaymentProvider = 'stripe' | 'square' | null;

export function isPaymentEnabled(): boolean {
  const provider = process.env.PAYMENT_PROVIDER?.toLowerCase();
  return provider === 'stripe' || provider === 'square';
}

export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER?.toLowerCase();
  
  if (provider === 'stripe') {
    return 'stripe';
  }
  
  if (provider === 'square') {
    return 'square';
  }
  
  return null;
}

export function isStripeEnabled(): boolean {
  return process.env.PAYMENT_PROVIDER?.toLowerCase() === 'stripe';
}

export function isSquareEnabled(): boolean {
  return process.env.PAYMENT_PROVIDER?.toLowerCase() === 'square';
}

export function getStripeConfig() {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  };
}

export function validateStripeConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!process.env.STRIPE_SECRET_KEY) missing.push('STRIPE_SECRET_KEY');
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) missing.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  if (!process.env.STRIPE_WEBHOOK_SECRET) missing.push('STRIPE_WEBHOOK_SECRET');
  
  return {
    valid: missing.length === 0,
    missing,
  };
}
