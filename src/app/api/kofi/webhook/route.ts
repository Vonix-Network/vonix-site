/**
 * Ko-Fi Webhook Handler
 * 
 * Receives donation notifications from Ko-Fi and processes them
 * using the unified donation processing system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, donations, donationRanks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyKofiToken, getPaymentProvider } from '@/lib/kofi';
import { processDonation, findBestRankForAmount } from '@/lib/donations';

/**
 * Ko-Fi webhook payload structure
 */
interface KofiWebhookData {
    verification_token: string;
    message_id: string;
    timestamp: string;
    type: 'Donation' | 'Subscription' | 'Commission' | 'Shop Order';
    is_public: boolean;
    from_name: string;
    message: string | null;
    amount: string;
    url: string;
    email: string;
    currency: string;
    is_subscription_payment: boolean;
    is_first_subscription_payment: boolean;
    kofi_transaction_id: string;
    tier_name: string | null;
    shop_items: Array<{
        direct_link_code: string;
        variation_name: string;
        quantity: number;
    }> | null;
    shipping: {
        full_name: string;
        street_address: string;
        city: string;
        state_or_province: string;
        postal_code: string;
        country: string;
        country_code: string;
        telephone: string;
    } | null;
    discord_username: string | null;
    discord_userid: string | null;
}

/**
 * Try to find a user based on Ko-Fi data (message, from_name, email)
 */
async function findUserFromKofiData(data: KofiWebhookData): Promise<{
    userId?: number;
    minecraftUsername?: string;
}> {
    // Strategy 1: Check if message contains a Minecraft username
    if (data.message) {
        const potentialUsername = data.message.trim().split(/\s+/)[0];
        if (/^[a-zA-Z0-9_]{3,16}$/.test(potentialUsername)) {
            const [user] = await db
                .select({ id: users.id, minecraftUsername: users.minecraftUsername })
                .from(users)
                .where(eq(users.minecraftUsername, potentialUsername))
                .limit(1);

            if (user) {
                return { userId: user.id, minecraftUsername: user.minecraftUsername || undefined };
            }

            // Try website username
            const [userByName] = await db
                .select({ id: users.id, minecraftUsername: users.minecraftUsername })
                .from(users)
                .where(eq(users.username, potentialUsername))
                .limit(1);

            if (userByName) {
                return { userId: userByName.id, minecraftUsername: userByName.minecraftUsername || undefined };
            }
        }
    }

    // Strategy 2: Check from_name
    if (data.from_name) {
        const potentialUsername = data.from_name.trim().split(/\s+/)[0];
        if (/^[a-zA-Z0-9_]{3,16}$/.test(potentialUsername)) {
            const [user] = await db
                .select({ id: users.id, minecraftUsername: users.minecraftUsername })
                .from(users)
                .where(eq(users.minecraftUsername, potentialUsername))
                .limit(1);

            if (user) {
                return { userId: user.id, minecraftUsername: user.minecraftUsername || undefined };
            }
        }
    }

    // Strategy 3: Check by email
    if (data.email) {
        const [user] = await db
            .select({ id: users.id, minecraftUsername: users.minecraftUsername })
            .from(users)
            .where(eq(users.email, data.email))
            .limit(1);

        if (user) {
            return { userId: user.id, minecraftUsername: user.minecraftUsername || undefined };
        }
    }

    // No user found - treat as guest
    return {};
}

/**
 * POST /api/kofi/webhook
 * Handles Ko-Fi webhook events for donations
 */
export async function POST(request: NextRequest) {
    try {
        // Check if Ko-Fi is the active payment provider
        const paymentProvider = await getPaymentProvider();
        if (paymentProvider !== 'kofi') {
            console.log('Ko-Fi webhook received but payment provider is not set to Ko-Fi');
            return NextResponse.json({ error: 'Ko-Fi payments not enabled' }, { status: 503 });
        }

        // Ko-Fi sends data as form-urlencoded
        const formData = await request.formData();
        const dataString = formData.get('data') as string;

        if (!dataString) {
            return NextResponse.json({ error: 'Invalid request: missing data field' }, { status: 400 });
        }

        // Parse the JSON data
        let data: KofiWebhookData;
        try {
            data = JSON.parse(dataString);
        } catch {
            return NextResponse.json({ error: 'Invalid JSON in data field' }, { status: 400 });
        }

        // Verify the token
        const isValid = await verifyKofiToken(data.verification_token);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid verification token' }, { status: 401 });
        }

        console.log('Ko-Fi webhook received:', {
            type: data.type,
            from: data.from_name,
            amount: data.amount,
            currency: data.currency,
            transactionId: data.kofi_transaction_id,
        });

        // Only process donations and subscriptions
        if (data.type !== 'Donation' && data.type !== 'Subscription') {
            console.log(`Ko-Fi webhook type ${data.type} not handled`);
            return NextResponse.json({ received: true, processed: false });
        }

        // Check for duplicate (idempotency)
        const transactionId = `kofi_${data.kofi_transaction_id}`;
        const [existingDonation] = await db
            .select({ id: donations.id })
            .from(donations)
            .where(eq(donations.paymentId, transactionId))
            .limit(1);

        if (existingDonation) {
            console.log('Ko-Fi donation already processed:', data.kofi_transaction_id);
            return NextResponse.json({ received: true, duplicate: true });
        }

        // Parse amount
        const amount = parseFloat(data.amount);
        if (isNaN(amount) || amount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        // Determine rank from tier_name if present (Ko-Fi Memberships)
        let rankId: string | undefined;
        if (data.tier_name) {
            const tierRankId = data.tier_name.toLowerCase();
            const [rankExists] = await db
                .select({ id: donationRanks.id })
                .from(donationRanks)
                .where(eq(donationRanks.id, tierRankId))
                .limit(1);

            if (rankExists) {
                rankId = tierRankId;
                console.log(`Matched Ko-Fi tier '${data.tier_name}' to rank '${rankId}'`);
            }
        }

        // Find user
        const userInfo = await findUserFromKofiData(data);
        const isGuest = !userInfo.userId;

        // Determine payment type
        let paymentType: 'one_time' | 'subscription' | 'subscription_renewal' = 'one_time';
        if (data.is_subscription_payment) {
            paymentType = data.is_first_subscription_payment ? 'subscription' : 'subscription_renewal';
        }

        // Process the donation (Ko-Fi uses findBestRankForAmount since rankId may not be set)
        const result = await processDonation({
            userId: userInfo.userId,
            guestName: isGuest ? data.from_name : undefined,
            minecraftUsername: userInfo.minecraftUsername,
            email: data.email,
            amount,
            currency: data.currency || 'USD',
            method: 'kofi',
            paymentType,
            transactionId,
            rankId, // If tier_name matched, use it; otherwise processDonation will find by amount
            message: data.message || undefined,
        });

        if (result.success) {
            console.log(`✅ Ko-Fi donation processed: $${amount} from ${data.from_name}`);
            return NextResponse.json({ received: true, processed: true, donationId: result.donationId });
        } else {
            console.error('Failed to process Ko-Fi donation:', result.error);
            return NextResponse.json({ error: result.error }, { status: 500 });
        }
    } catch (error: any) {
        console.error('Ko-Fi webhook error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * GET /api/kofi/webhook - Health check
 */
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        provider: 'kofi',
        message: 'Ko-Fi webhook endpoint is active',
    });
}
