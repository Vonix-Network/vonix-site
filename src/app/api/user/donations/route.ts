/**
 * User Donations API
 * 
 * Returns the current user's donation history
 */

import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { donations } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

// Force dynamic - always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const userId = parseInt(session.user.id as string);

        // Get user's donations ordered by most recent first
        const userDonations = await db
            .select({
                id: donations.id,
                amount: donations.amount,
                currency: donations.currency,
                method: donations.method,
                paymentType: donations.paymentType,
                rankId: donations.rankId,
                days: donations.days,
                createdAt: donations.createdAt,
                message: donations.message,
            })
            .from(donations)
            .where(eq(donations.userId, userId))
            .orderBy(desc(donations.createdAt))
            .limit(50);

        return NextResponse.json({
            donations: userDonations,
        });
    } catch (error: any) {
        console.error('Error fetching user donations:', error);
        return NextResponse.json(
            { error: 'Failed to fetch donations' },
            { status: 500 }
        );
    }
}
