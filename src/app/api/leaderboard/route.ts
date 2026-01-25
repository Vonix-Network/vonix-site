import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, serverXp, donationRanks, minecraftPlayers } from '@/db/schema';
import { desc, eq, sql, isNull } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface LeaderboardEntry {
  id: number | string;
  username: string;
  minecraftUsername: string | null;
  xp: number;
  level: number;
  role: string | null;
  title: string | null;
  avatar: string | null;
  playtimeSeconds: number;
  donationRank: {
    id: string;
    name: string;
    color: string;
  } | null;
  isRegistered: boolean; // true = registered user, false = unregistered Minecraft player
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type') || 'xp'; // 'xp' or 'playtime'

    // ========== Get registered users with their XP and playtime ==========
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

    // Get playtime per registered user from serverXp
    const playtimeData = await db
      .select({
        userId: serverXp.userId,
        totalPlaytime: sql<number>`SUM(${serverXp.playtimeSeconds})`.as('total_playtime'),
      })
      .from(serverXp)
      .groupBy(serverXp.userId);

    // Create a map of userId -> playtime
    const playtimeMap = new Map<number, number>();
    playtimeData.forEach((p: any) => {
      playtimeMap.set(p.userId, Number(p.totalPlaytime || 0));
    });

    const now = new Date();

    // Build registered users entries
    const registeredEntries: LeaderboardEntry[] = usersData.map((user: any) => ({
      id: user.id,
      username: user.username,
      minecraftUsername: user.minecraftUsername,
      xp: Number(user.xp || 0),
      level: Number(user.level || 1),
      role: user.role,
      title: user.title,
      avatar: user.avatar,
      playtimeSeconds: playtimeMap.get(user.id) || 0,
      donationRank: user.donationRankId && user.rankExpiresAt && new Date(user.rankExpiresAt) > now
        ? {
          id: user.donationRankId,
          name: user.rankName,
          color: user.rankColor,
        }
        : null,
      isRegistered: true,
    }));

    // ========== Get unregistered Minecraft players ==========
    // Only get players who are NOT linked to a registered user
    const unregisteredPlayers = await db
      .select({
        id: minecraftPlayers.id,
        uuid: minecraftPlayers.uuid,
        username: minecraftPlayers.username,
        xp: minecraftPlayers.xp,
        level: minecraftPlayers.level,
        playtimeSeconds: minecraftPlayers.playtimeSeconds,
        linkedUserId: minecraftPlayers.linkedUserId,
      })
      .from(minecraftPlayers)
      .where(isNull(minecraftPlayers.linkedUserId));

    // Build unregistered player entries
    const unregisteredEntries: LeaderboardEntry[] = unregisteredPlayers.map((player: any) => ({
      id: `mc-${player.id}`, // Prefix to distinguish from user IDs
      username: player.username,
      minecraftUsername: player.username,
      xp: Number(player.xp || 0),
      level: Number(player.level || 1),
      role: null,
      title: null,
      avatar: null,
      playtimeSeconds: Number(player.playtimeSeconds || 0),
      donationRank: null,
      isRegistered: false,
    }));

    // ========== Combine and sort ==========
    const allEntries = [...registeredEntries, ...unregisteredEntries];

    // Sort based on type
    if (type === 'playtime') {
      allEntries.sort((a, b) => b.playtimeSeconds - a.playtimeSeconds);
    } else {
      allEntries.sort((a, b) => b.xp - a.xp);
    }

    // Apply pagination
    const paginatedEntries = allEntries.slice(offset, offset + limit);

    return NextResponse.json(paginatedEntries);
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
