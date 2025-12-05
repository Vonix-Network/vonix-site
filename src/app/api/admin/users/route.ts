import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { desc, sql, gte } from 'drizzle-orm';

async function requireAdmin() {
  const session = await auth();
  const user = session?.user as any;

  if (!session || !['admin', 'superadmin', 'moderator'].includes(user?.role)) {
    throw new Error('Unauthorized');
  }

  return user;
}

/**
 * GET /api/admin/users
 * Returns paginated user list with counts for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get total count
    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    // Get recently active count (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [{ count: recentlyActive }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(gte(users.lastLoginAt, oneDayAgo));

    // Get users with pagination
    const userList = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        minecraftUsername: users.minecraftUsername,
        minecraftUuid: users.minecraftUuid,
        avatar: users.avatar,
        level: users.level,
        xp: users.xp,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      users: userList,
      total,
      recentlyActive,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

