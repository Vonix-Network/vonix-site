/**
 * Ko-Fi Webhook Handler
 * 
 * Receives donation notifications from Ko-Fi and processes them
 * similar to how Stripe donations are handled.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, donations, donationRanks } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { sendAdminDonationAlert } from '@/lib/email';
import { verifyKofiToken, getPaymentProvider } from '@/lib/kofi';

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
    shop_items: Array<{
        direct_link_code: string;
        variation_name: string;
        quantity: number;
    }> | null;
    tier_name: string | null;
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
 * Find the best matching rank for a given donation amount
 */
async function findBestRankForAmount(amount: number): Promise<{
    id: string;
    name: string;
    minAmount: number;
} | null> {
    // Get all ranks ordered by min amount descending (highest first)
    const ranks = await db
        .select({
            id: donationRanks.id,
            name: donationRanks.name,
            minAmount: donationRanks.minAmount,
        })
        .from(donationRanks)
        .orderBy(desc(donationRanks.minAmount));

    // Find the highest rank that the donation amount qualifies for
    for (const rank of ranks) {
        if (amount >= rank.minAmount) {
            return rank;
        }
    }

    return null;
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
            return NextResponse.json(
                { error: 'Ko-Fi payments not enabled' },
                { status: 503 }
            );
        }

        // Ko-Fi sends data as form-urlencoded
        const formData = await request.formData();
        const dataString = formData.get('data') as string;

        if (!dataString) {
            console.error('No data field in Ko-Fi webhook');
            return NextResponse.json(
                { error: 'Invalid request: missing data field' },
                { status: 400 }
            );
        }

        // Parse the JSON data
        let data: KofiWebhookData;
        try {
            data = JSON.parse(dataString);
        } catch (e) {
            console.error('Failed to parse Ko-Fi webhook data:', e);
            return NextResponse.json(
                { error: 'Invalid JSON in data field' },
                { status: 400 }
            );
        }

        // Verify the token
        const isValid = await verifyKofiToken(data.verification_token);
        if (!isValid) {
            console.error('Invalid Ko-Fi verification token');
            return NextResponse.json(
                { error: 'Invalid verification token' },
                { status: 401 }
            );
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

        // Check for duplicate webhook (idempotency)
        const [existingDonation] = await db
            .select()
            .from(donations)
            .where(eq(donations.paymentId, `kofi_${data.kofi_transaction_id}`))
            .limit(1);

        if (existingDonation) {
            console.log('Ko-Fi donation already processed:', data.kofi_transaction_id);
            return NextResponse.json({ received: true, duplicate: true });
        }

        // Parse amount
        const amount = parseFloat(data.amount);
        if (isNaN(amount) || amount <= 0) {
            console.error('Invalid amount in Ko-Fi webhook:', data.amount);
            return NextResponse.json(
                { error: 'Invalid amount' },
                { status: 400 }
            );
        }

        // Determine Rank
        let rankId: string | null = null;
        let rankDays = 30; // Default to 30 days for Ko-Fi donations

        // Priority 1: Use tier_name if present (for Memberships)
        if (data.tier_name) {
            rankId = data.tier_name.toLowerCase();
            // Verify if this rank exists in our DB to be safe, otherwise fallback to amount matching
            const [rankExists] = await db
                .select()
                .from(donationRanks)
                .where(eq(donationRanks.id, rankId))
                .limit(1);

            if (!rankExists) {
                console.warn(`Ko-Fi tier name '${data.tier_name}' does not match any rank ID. Falling back to amount matching.`);
                rankId = null;
            } else {
                console.log(`Matched Ko-Fi tier '${data.tier_name}' to rank '${rankId}'`);
            }
        }

        // Priority 2: Find the best rank based on donation amount if no tier matched
        if (!rankId) {
            const matchedRank = await findBestRankForAmount(amount);
            if (matchedRank) {
                rankId = matchedRank.id;
                // Calculate days based on amount vs monthly min amount
                // If they donated more than the minimum, give proportional time
                if (matchedRank.minAmount > 0) {
                    rankDays = Math.floor((amount / matchedRank.minAmount) * 30);
                    rankDays = Math.max(rankDays, 7); // Minimum 7 days
                    rankDays = Math.min(rankDays, 365); // Maximum 1 year
                }
                console.log(`Matched Ko-Fi donation to rank: ${matchedRank.name} for ${rankDays} days`);
            }
        }

        // Try to find user
        let userId: number | null = null;
        let username = data.from_name;
        let foundUser: typeof users.$inferSelect | undefined;

        // Strategy 1: Check if message contains a valid Minecraft username
        if (data.message) {
            // Clean message, look for single word that looks like a username
            const potentialUsername = data.message.trim().split(/\s+/)[0];
            // Basic regex for MC username (3-16 chars, letters, numbers, underscores)
            if (/^[a-zA-Z0-9_]{3,16}$/.test(potentialUsername)) {
                // Try to find user by username or minecraftUsername
                const [userByMc] = await db
                    .select()
                    .from(users)
                    .where(eq(users.minecraftUsername, potentialUsername))
                    .limit(1);

                if (userByMc) {
                    foundUser = userByMc;
                    console.log(`Found user by Minecraft username in message: ${potentialUsername}`);
                } else {
                    // Try regular username check too
                    const [userByName] = await db
                        .select()
                        .from(users)
                        .where(eq(users.username, potentialUsername))
                        .limit(1);

                    if (userByName) {
                        foundUser = userByName;
                        console.log(`Found user by website username in message: ${potentialUsername}`);
                    }
                }
            }
        }

        // Strategy 2: Fallback to Display Name (from_name)
        if (!foundUser && data.from_name) {
            // Clean display name, similar logic
            const potentialUsername = data.from_name.trim().split(/\s+/)[0];
            if (/^[a-zA-Z0-9_]{3,16}$/.test(potentialUsername)) {
                // Try to find user by username or minecraftUsername
                const [userByMc] = await db
                    .select()
                    .from(users)
                    .where(eq(users.minecraftUsername, potentialUsername))
                    .limit(1);

                if (userByMc) {
                    foundUser = userByMc;
                    console.log(`Found user by Minecraft username in display name: ${potentialUsername}`);
                } else {
                    // Try regular username check too
                    const [userByName] = await db
                        .select()
                        .from(users)
                        .where(eq(users.username, potentialUsername))
                        .limit(1);

                    if (userByName) {
                        foundUser = userByName;
                        console.log(`Found user by website username in display name: ${potentialUsername}`);
                    }
                }
            }
        }

        // Strategy 3: Fallback to Email lookup
        if (!foundUser && data.email) {
            const [userByEmail] = await db
                .select()
                .from(users)
                .where(eq(users.email, data.email))
                .limit(1);

            if (userByEmail) {
                foundUser = userByEmail;
                console.log(`Found user by email: ${data.email}`);
            }
        }

        if (foundUser) {
            userId = foundUser.id;
            username = foundUser.minecraftUsername || foundUser.username;

            // Calculate new expiration date
            const now = new Date();
            let newExpiresAt: Date;

            if (foundUser.rankExpiresAt && new Date(foundUser.rankExpiresAt) > now) {
                // Extend existing rank
                newExpiresAt = new Date(foundUser.rankExpiresAt);
                newExpiresAt.setDate(newExpiresAt.getDate() + rankDays);
            } else {
                // New rank assignment
                newExpiresAt = new Date();
                newExpiresAt.setDate(newExpiresAt.getDate() + rankDays);
            }

            // Update user with rank and total donated
            const updateData: Record<string, any> = {
                totalDonated: (foundUser.totalDonated || 0) + amount,
                updatedAt: new Date(),
            };

            if (rankId) {
                updateData.donationRankId = rankId;
                updateData.rankExpiresAt = newExpiresAt;
            }

            await db
                .update(users)
                .set(updateData)
                .where(eq(users.id, foundUser.id));

            if (rankId) {
                console.log(`✅ Assigned rank ${rankId} to user ${username} until ${newExpiresAt.toISOString()}`);
            }
        }

        // Create donation record
        const receiptNumber = `VN-KO-${Date.now()}-${data.kofi_transaction_id.slice(-6)}`;

        await db.insert(donations).values({
            userId,
            amount,
            currency: data.currency || 'USD',
            method: 'kofi',
            message: data.message || `Ko-Fi ${data.type} from ${data.from_name}`,
            displayed: data.is_public,
            receiptNumber,
            paymentId: `kofi_${data.kofi_transaction_id}`,
            rankId: rankId || undefined,
            days: rankDays,
            paymentType: 'one_time', // Ko-Fi payments are treated as one-time in our DB
            status: 'completed',
            createdAt: new Date(),
        });

        console.log(`✅ Ko-Fi donation processed: $${amount} from ${data.from_name}${rankId ? ` → ${rankId} rank for ${rankDays} days` : ''}`);

        // Send Discord notification
        try {
            const { sendDonationDiscordNotification } = await import('@/lib/discord-notifications');

            // Get rank name for display
            let rankName: string | null = null;
            if (rankId) {
                const [rank] = await db
                    .select({ name: donationRanks.name })
                    .from(donationRanks)
                    .where(eq(donationRanks.id, rankId))
                    .limit(1);
                rankName = rank?.name || rankId;
            }

            await sendDonationDiscordNotification({
                username: username,
                minecraftUsername: foundUser?.minecraftUsername || undefined,
                amount,
                currency: data.currency || 'USD',
                paymentType: 'one_time',
                rankName: rankName,
                days: rankId ? rankDays : null,
                message: data.message || null,
            });
            console.log('✅ Sent Discord donation notification');
        } catch (discordError) {
            console.error('Failed to send Discord notification:', discordError);
        }

        // Send admin notification (async, don't wait)
        sendAdminDonationAlert(username, amount, rankId || undefined)
            .catch(err => console.error('Failed to send admin donation alert:', err));

        return NextResponse.json({
            received: true,
            processed: true,
            amount,
            from: data.from_name,
            rankAssigned: rankId,
            daysGranted: rankId ? rankDays : 0,
        });

    } catch (error: any) {
        console.error('Error processing Ko-Fi webhook:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/kofi/webhook
 * Health check endpoint
 */
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        provider: 'kofi',
        message: 'Ko-Fi webhook endpoint is active',
    });
}

