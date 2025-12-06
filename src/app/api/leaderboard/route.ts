import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const leaderboard = await db
      .select({
        id: users.id,
        username: users.username,
        minecraftUsername: users.minecraftUsername,
        xp: users.xp,
        level: users.level,
        role: users.role,
        title: users.title,
        avatar: users.avatar,
      })
      .from(users)
      .orderBy(desc(users.xp))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

