import { NextResponse } from 'next/server';
import { db } from '@/db';
import { donationRanks } from '@/db/schema';
import { asc } from 'drizzle-orm';

/**
 * GET /api/donation-ranks
 * Public endpoint to get all donation ranks
 */
export async function GET() {
  try {
    const ranks = await db
      .select()
      .from(donationRanks)
      .orderBy(asc(donationRanks.minAmount));

    // Parse features JSON for each rank
    const ranksWithFeatures = ranks.map(rank => ({
      ...rank,
      perks: rank.perks ? JSON.parse(rank.perks) : [],
    }));

    return NextResponse.json(ranksWithFeatures, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Error fetching donation ranks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch donation ranks' },
      { status: 500 }
    );
  }
}

