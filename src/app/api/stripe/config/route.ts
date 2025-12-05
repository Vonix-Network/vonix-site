import { NextResponse } from 'next/server';
import { getPublishableKey, isStripeConfigured, getStripeMode } from '@/lib/stripe';

/**
 * GET /api/stripe/config
 * Returns the Stripe publishable key and mode for client-side usage
 * This loads from database settings first, then falls back to env vars
 */
export async function GET() {
    try {
        const [publishableKey, configured, mode] = await Promise.all([
            getPublishableKey(),
            isStripeConfigured(),
            getStripeMode(),
        ]);

        if (!configured) {
            return NextResponse.json(
                {
                    configured: false,
                    message: 'Stripe is not configured. Please set up Stripe in the admin dashboard.'
                },
                { status: 200 }
            );
        }

        return NextResponse.json({
            configured: true,
            publishableKey,
            mode,
        });
    } catch (error) {
        console.error('Error fetching Stripe config:', error);
        return NextResponse.json(
            { error: 'Failed to fetch Stripe configuration' },
            { status: 500 }
        );
    }
}
