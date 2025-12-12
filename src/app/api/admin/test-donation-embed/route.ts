import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { sendDonationDiscordNotification } from '@/lib/discord-notifications';

async function requireAdmin() {
    const session = await auth();
    const user = session?.user as any;

    if (!session || !['admin', 'superadmin', 'owner'].includes(user?.role)) {
        throw new Error('Unauthorized');
    }

    return user;
}

/**
 * POST /api/admin/test-donation-embed
 * 
 * Sends a test donation embed to the configured Discord webhook.
 * Requires admin authentication.
 */
export async function POST(req: NextRequest) {
    try {
        // Auth check
        await requireAdmin();

        const body = await req.json();
        const { includeRank } = body;

        // Build test donation data
        const testDonation = {
            username: 'TestUser',
            minecraftUsername: 'TestUser',
            amount: 10.00,
            currency: 'USD',
            paymentType: 'one_time' as const,
            rankName: includeRank ? 'Champion' : null,
            days: includeRank ? 30 : null,
            message: null,
        };

        const success = await sendDonationDiscordNotification(testDonation);

        if (success) {
            return NextResponse.json({
                success: true,
                message: `Test donation embed ${includeRank ? 'with rank' : 'without rank'} sent successfully!`
            });
        } else {
            return NextResponse.json({
                success: false,
                error: 'Failed to send test embed. Check that the webhook URL is configured correctly.'
            }, { status: 400 });
        }

    } catch (error: any) {
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
        console.error('Error sending test donation embed:', error);
        return NextResponse.json({
            error: 'Failed to send test donation embed'
        }, { status: 500 });
    }
}
