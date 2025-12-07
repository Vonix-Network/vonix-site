import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, serverXp, donationRanks } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type') || 'xp'; // 'xp' or 'playtime'

    // Get all users with their base data and donation rank info
    const usersData = await db
      .select({
        id: users.id,
        username: users.username,
        minecraftUsername: users.minecraftUsername,
        xp: users.xp,
        level: users.level,
        role: users.role,
        title: users.title,
        avatar: users.avatar,
        donationRankId: users.donationRankId,
        rankExpiresAt: users.rankExpiresAt,
        rankName: donationRanks.name,
        rankColor: donationRanks.color,
      })
      .from(users)
      .leftJoin(donationRanks, eq(users.donationRankId, donationRanks.id));

    // Get playtime per user from serverXp
    const playtimeData = await db
      .select({
        userId: serverXp.userId,
        totalPlaytime: sql<number>`SUM(${serverXp.playtimeSeconds})`.as('total_playtime'),
      })
      .from(serverXp)
      .groupBy(serverXp.userId);

    // Create a map of userId -> playtime
    const playtimeMap = new Map<number, number>();
    playtimeData.forEach(p => {
      playtimeMap.set(p.userId, p.totalPlaytime || 0);
    });

    const now = new Date();

    // Combine users with their playtime and filter rank expiration
    const usersWithPlaytime = usersData.map(user => ({
      ...user,
      playtimeSeconds: playtimeMap.get(user.id) || 0,
      // Only include rank if not expired
      donationRank: user.donationRankId && user.rankExpiresAt && new Date(user.rankExpiresAt) > now
        ? {
          id: user.donationRankId,
          name: user.rankName,
          color: user.rankColor,
        }
        : null,
    }));

    // Sort based on type
    if (type === 'playtime') {
      usersWithPlaytime.sort((a, b) => (b.playtimeSeconds || 0) - (a.playtimeSeconds || 0));
    } else {
      usersWithPlaytime.sort((a, b) => (b.xp || 0) - (a.xp || 0));
    }

    // Apply pagination
    const paginatedUsers = usersWithPlaytime.slice(offset, offset + limit);

    return NextResponse.json(paginatedUsers);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

