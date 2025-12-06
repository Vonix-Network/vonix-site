import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { desc, sql, gte, or, like } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

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
    const search = searchParams.get('search') || '';

    let whereClause = undefined;
    if (search) {
      whereClause = or(
        like(users.username, `%${search}%`),
        like(users.email, `%${search}%`),
        like(users.minecraftUsername, `%${search}%`)
      );
    }

    // Get total count
    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause);

    // Get recently active count (last 24 hours) - Global stat, unaffected by search
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
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(whereClause)
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

/**
 * POST /api/admin/users
 * Create a new user from admin panel
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { username, email, password, role, minecraftUsername } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const [newUser] = await db.insert(users).values({
      username,
      email: email || null,
      password: hashedPassword,
      role: role || 'user',
      minecraftUsername: minecraftUsername || null,
    }).returning();

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Handle unique constraint violation
    if (error?.message?.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 400 }
      );
    }

    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
