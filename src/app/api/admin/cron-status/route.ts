import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { getCronStatus } from '@/lib/cron';

/**
 * GET /api/admin/cron-status
 * Get status of all cron jobs
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    const user = session?.user as any;
    
    if (!session || !['admin', 'superadmin'].includes(user?.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const status = getCronStatus();

    return NextResponse.json({
      success: true,
      jobs: status,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error getting cron status:', error);
    return NextResponse.json(
      { error: 'Failed to get cron status' },
      { status: 500 }
    );
  }
}
