import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../auth';
import { db } from '@/db';
import { donations, users, donationRanks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendDonationDiscordNotification } from '@/lib/discord-notifications';

async function requireAdmin() {
    const session = await auth();
    const user = session?.user as any;

    if (!session || !['admin', 'superadmin'].includes(user?.role)) {
        throw new Error('Unauthorized');
    }

    return user;
}

type RouteParams = {
    params: Promise<{ id: string }>;
};

/**
 * POST /api/admin/donations/[id]/resend-discord
 * Resend Discord notification for a donation
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        await requireAdmin();

        const { id } = await params;
        const donationId = parseInt(id);

        // Get donation with user info
        const [donation] = await db
            .select()
            .from(donations)
            .where(eq(donations.id, donationId));

        if (!donation) {
            return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
        }

        // Get user if exists
        let username = 'Anonymous';
        let minecraftUsername: string | undefined;

        if (donation.userId) {
            const [user] = await db
                .select()
                .from(users)
                .where(eq(users.id, donation.userId));

            if (user) {
                username = user.minecraftUsername || user.username;
                minecraftUsername = user.minecraftUsername || undefined;
            }
        } else if (donation.minecraftUsername) {
            // Guest donation
            username = donation.minecraftUsername;
            minecraftUsername = donation.minecraftUsername;
        }

        // Get rank name if applicable
        let rankName: string | null = null;
        if (donation.rankId) {
            const [rank] = await db
                .select({ name: donationRanks.name })
                .from(donationRanks)
                .where(eq(donationRanks.id, donation.rankId));
            rankName = rank?.name || donation.rankId;
        }

        // Send Discord notification
        const success = await sendDonationDiscordNotification({
            username,
            minecraftUsername,
            amount: donation.amount,
            currency: donation.currency || 'USD',
            paymentType: donation.paymentType as 'one_time' | 'subscription' | 'renewal' | 'subscription_renewal' || 'one_time',
            rankName,
            days: donation.days,
            message: donation.message,
        });

        if (success) {
            return NextResponse.json({ success: true, message: 'Discord notification sent' });
        } else {
            return NextResponse.json({ error: 'Failed to send Discord notification' }, { status: 500 });
        }
    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
        console.error('Error resending Discord notification:', error);
        return NextResponse.json({ error: 'Failed to resend notification' }, { status: 500 });
    }
}
