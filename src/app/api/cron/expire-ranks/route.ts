import { NextRequest, NextResponse } from 'next/server';
import { removeExpiredRanks } from '@/lib/rank-subscription';

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/expire-ranks
 * Cron job to remove expired donation ranks
 * Should be called every hour
 * 
 * Authentication: ?secret=<CRON_SECRET> or Authorization header
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret - multiple methods for flexibility
    const authHeader = request.headers.get('authorization');
    const cronSecretHeader = request.headers.get('x-cron-secret');
    const vercelCronHeader = request.headers.get('x-vercel-cron');
    const secretParam = request.nextUrl.searchParams.get('secret');

    const isAuthorized = !CRON_SECRET || // Allow if no secret configured
      authHeader === `Bearer ${CRON_SECRET}` ||
      cronSecretHeader === CRON_SECRET ||
      secretParam === CRON_SECRET ||
      vercelCronHeader !== null;

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🕐 Running rank expiration check...');

    const result = await removeExpiredRanks();

    console.log(`✅ Rank expiration complete: ${result.removed} ranks removed`);

    return NextResponse.json({
      success: true,
      removed: result.removed,
      users: result.users,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in expire-ranks cron:', error);
    return NextResponse.json(
      { error: 'Failed to process expired ranks' },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
