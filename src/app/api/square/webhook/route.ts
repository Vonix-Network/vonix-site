/**
 * Square Webhook Handler
 * 
 * Receives payment notifications from Square and processes them
 * using the unified donation processing system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, donations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyWebhookSignature } from '@/lib/square';
import { getPaymentProvider } from '@/lib/kofi';
import { processDonation } from '@/lib/donations';

/**
 * Square webhook payload structure
 */
interface SquareWebhookEvent {
    merchant_id: string;
    type: string;
    event_id: string;
    created_at: string;
    data: {
        type: string;
        id: string;
        object: {
            payment?: {
                id: string;
                status: string;
                amount_money: {
                    amount: number;
                    currency: string;
                };
                order_id?: string;
                customer_id?: string;
                receipt_url?: string;
                buyer_email_address?: string;
            };
            subscription?: {
                id: string;
                status: string;
            };
            invoice?: {
                id: string;
                subscription_id?: string;
                payment_requests?: Array<{
                    computed_amount_money?: {
                        amount: number;
                        currency: string;
                    };
                }>;
            };
            order?: {
                id: string;
                location_id: string;
                state: string;
                total_money: { amount: number; currency: string };
                metadata?: Record<string, string>;
            };
        };
    };
}

/**
 * POST /api/square/webhook
 */
export async function POST(request: NextRequest) {
    try {
        // Check if Square is the active payment provider
        const paymentProvider = await getPaymentProvider();
        if (paymentProvider !== 'square') {
            return NextResponse.json({ error: 'Square payments not enabled' }, { status: 503 });
        }

        const body = await request.text();
        const signature = request.headers.get('x-square-hmacsha256-signature') || '';
        const url = request.url;

        // Verify webhook signature
        const isValid = await verifyWebhookSignature(body, signature, url);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const event: SquareWebhookEvent = JSON.parse(body);
        console.log('Square webhook received:', { type: event.type, eventId: event.event_id });

        switch (event.type) {
            case 'payment.updated':
            case 'payment.completed':
                await handlePaymentUpdated(event);
                break;
            case 'subscription.created':
                console.log('Square subscription created:', event.data.object.subscription?.id);
                break;
            case 'subscription.updated':
                await handleSubscriptionUpdated(event);
                break;
            case 'invoice.payment_made':
                await handleInvoicePaymentMade(event);
                break;
            default:
                console.log(`Square webhook type ${event.type} not handled`);
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('Error processing Square webhook:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}

/**
 * Handle payment.updated/payment.completed - one-time payments
 */
async function handlePaymentUpdated(event: SquareWebhookEvent) {
    const payment = event.data.object.payment;
    if (!payment || payment.status !== 'COMPLETED') return;

    const transactionId = `square_${payment.id}`;

    // Get order metadata for user/rank info
    let metadata: Record<string, string> = {};
    if (payment.order_id) {
        try {
            const { getSquareClient } = await import('@/lib/square');
            const client = await getSquareClient();
            const orderResponse = await client.ordersApi.retrieveOrder(payment.order_id);
            metadata = orderResponse.result.order?.metadata || {};
        } catch (error: any) {
            console.error('Error fetching Square order:', error);
        }
    }

    const userId = metadata.userId ? parseInt(metadata.userId) : undefined;
    const rankId = metadata.rankId;
    const days = metadata.days ? parseInt(metadata.days) : 30;

    await processDonation({
        userId,
        email: payment.buyer_email_address,
        amount: payment.amount_money.amount / 100,
        currency: payment.amount_money.currency || 'USD',
        method: 'square',
        paymentType: 'one_time',
        transactionId,
        rankId,
        days,
        receiptUrl: payment.receipt_url,
    });
}

/**
 * Handle subscription.updated
 */
async function handleSubscriptionUpdated(event: SquareWebhookEvent) {
    const subscription = event.data.object.subscription;
    if (!subscription) return;

    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.squareSubscriptionId, subscription.id))
        .limit(1);

    if (!user) return;

    const statusMap: Record<string, 'active' | 'canceled' | 'past_due' | 'paused' | 'trialing'> = {
        'ACTIVE': 'active',
        'CANCELED': 'canceled',
        'DEACTIVATED': 'canceled',
        'PAUSED': 'paused',
        'PENDING': 'trialing',
    };

    await db
        .update(users)
        .set({
            subscriptionStatus: statusMap[subscription.status] || 'active',
            updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

    console.log(`✅ Updated Square subscription status for user ${user.id} to ${subscription.status}`);
}

/**
 * Handle invoice.payment_made - subscription renewals
 */
async function handleInvoicePaymentMade(event: SquareWebhookEvent) {
    const invoice = event.data.object.invoice;
    if (!invoice?.subscription_id) return;

    const transactionId = `square_invoice_${invoice.id}`;

    // Check idempotency
    const [existing] = await db
        .select({ id: donations.id })
        .from(donations)
        .where(eq(donations.paymentId, transactionId))
        .limit(1);

    if (existing) {
        console.log('Square invoice already processed:', invoice.id);
        return;
    }

    // Find user by subscription
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.squareSubscriptionId, invoice.subscription_id))
        .limit(1);

    if (!user) return;

    const amount = (invoice.payment_requests?.[0]?.computed_amount_money?.amount || 0) / 100;
    const currency = invoice.payment_requests?.[0]?.computed_amount_money?.currency || 'USD';

    await processDonation({
        userId: user.id,
        amount,
        currency,
        method: 'square',
        paymentType: 'subscription_renewal',
        transactionId,
        subscriptionId: invoice.subscription_id,
        rankId: user.donationRankId || undefined,
        days: 30,
    });
}

/**
 * GET /api/square/webhook - Health check
 */
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        provider: 'square',
        message: 'Square webhook endpoint is active',
    });
}
