import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { users, friendships } from '@/db/schema';
import { and, or, like, eq, ne, inArray } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const viewerId = parseInt(session.user.id as string);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';

    if (!q) {
      return NextResponse.json({ results: [] });
    }

    // Basic username search (case-insensitive LIKE)
    const matchedUsers = await db
      .select({
        id: users.id,
        username: users.username,
        minecraftUsername: users.minecraftUsername,
      })
      .from(users)
      .where(and(
        like(users.username, `%${q}%`),
        ne(users.id, viewerId),
      ))
      .limit(20);

    if (matchedUsers.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const targetIds = matchedUsers.map((u) => u.id);

    const friendshipRows = await db
      .select({
        requesterId: friendships.requesterId,
        addresseeId: friendships.addresseeId,
        status: friendships.status,
      })
      .from(friendships)
      .where(
        or(
          and(eq(friendships.requesterId, viewerId), inArray(friendships.addresseeId, targetIds)),
          and(eq(friendships.addresseeId, viewerId), inArray(friendships.requesterId, targetIds)),
        ),
      );

    const results = matchedUsers.map((u) => {
      let status: 'none' | 'pending' | 'friends' = 'none';
      const rel = friendshipRows.find(
        (f) => (f.requesterId === viewerId && f.addresseeId === u.id) || (f.addresseeId === viewerId && f.requesterId === u.id),
      );
      if (rel) {
        if (rel.status === 'accepted') status = 'friends';
        else if (rel.status === 'pending') status = 'pending';
      }
      return { ...u, status };
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching friends:', error);
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}
