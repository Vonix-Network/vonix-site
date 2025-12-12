import { NextResponse } from 'next/server';
import { db } from '@/db';
import { donationRanks } from '@/db/schema';
import { asc } from 'drizzle-orm';

// Force dynamic - always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    // Parse features JSON for each rank - with safe parsing
    const ranksWithFeatures = ranks.map(rank => {
      let perks: string[] = [];
      try {
        if (typeof rank.perks === 'string' && rank.perks) {
          perks = JSON.parse(rank.perks);
        } else if (Array.isArray(rank.perks)) {
          perks = rank.perks;
        }
      } catch {
        perks = [];
      }
      return {
        ...rank,
        perks,
      };
    });

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

