/**
 * GET /api/payments/config
 * Returns the current payment provider configuration for client-side usage
 */

import { NextResponse } from 'next/server';
import { getPaymentProvider, getKofiPageUrl, isKofiConfigured } from '@/lib/kofi';
import { isStripeConfigured, getStripeMode, getPublishableKey } from '@/lib/stripe';

export async function GET() {
    try {
        const provider = await getPaymentProvider();

        if (provider === 'disabled') {
            return NextResponse.json({
                provider: 'disabled',
                enabled: false,
                message: 'Donations are currently disabled',
            });
        }

        if (provider === 'kofi') {
            const configured = await isKofiConfigured();
            const pageUrl = await getKofiPageUrl();

            return NextResponse.json({
                provider: 'kofi',
                enabled: configured,
                pageUrl: configured ? pageUrl : null,
                message: configured
                    ? 'Ko-Fi donations are enabled'
                    : 'Ko-Fi is not configured. Please set it up in the admin dashboard.',
            });
        }

        // Default: Stripe
        const configured = await isStripeConfigured();
        const mode = configured ? await getStripeMode() : 'test';
        const publishableKey = configured ? await getPublishableKey() : null;

        return NextResponse.json({
            provider: 'stripe',
            enabled: configured,
            mode,
            publishableKey,
            message: configured
                ? `Stripe ${mode} mode is enabled`
                : 'Stripe is not configured. Please set it up in the admin dashboard.',
        });

    } catch (error) {
        console.error('Error fetching payment config:', error);
        return NextResponse.json(
            {
                provider: 'disabled',
                enabled: false,
                error: 'Failed to fetch payment configuration'
            },
            { status: 500 }
        );
    }
}
