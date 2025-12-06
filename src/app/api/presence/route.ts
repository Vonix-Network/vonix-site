import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { PRESENCE_TIMEOUT } from '@/lib/presence';

/**
 * POST /api/presence - Heartbeat to update user's online status
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string);

    await db
      .update(users)
      .set({ lastSeenAt: new Date() })
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating presence:', error);
    return NextResponse.json({ error: 'Failed to update presence' }, { status: 500 });
  }
}

/**
 * GET /api/presence - Get online status for a list of user IDs
 * Query params: userIds (comma-separated list of user IDs)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userIdsParam = searchParams.get('userIds');

    if (!userIdsParam) {
      return NextResponse.json({ error: 'Missing userIds parameter' }, { status: 400 });
    }

    const userIds = userIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));

    if (userIds.length === 0) {
      return NextResponse.json({ presence: {} });
    }

    // Limit to 100 users at a time
    const limitedUserIds = userIds.slice(0, 100);

    const usersData = await db
      .select({ id: users.id, lastSeenAt: users.lastSeenAt })
      .from(users)
      .where(inArray(users.id, limitedUserIds));

    const now = Date.now();
    const presence: Record<number, { online: boolean; lastSeenAt: string | null }> = {};

    for (const user of usersData) {
      const lastSeen = user.lastSeenAt ? new Date(user.lastSeenAt).getTime() : 0;
      const isOnline = lastSeen > 0 && (now - lastSeen) < PRESENCE_TIMEOUT;

      presence[user.id] = {
        online: isOnline,
        lastSeenAt: user.lastSeenAt ? new Date(user.lastSeenAt).toISOString() : null,
      };
    }

    return NextResponse.json({ presence });
  } catch (error) {
    console.error('Error fetching presence:', error);
    return NextResponse.json({ error: 'Failed to fetch presence' }, { status: 500 });
  }
}

