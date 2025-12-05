import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { db } from '@/db';
import { friendships, users } from '@/db/schema';
import { and, or, eq } from 'drizzle-orm';
import { notifyFriendRequest, notifyFriendAccepted } from '@/lib/notifications';
import { isUserOnline } from '@/lib/presence';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const viewerId = parseInt(session.user.id as string);

    // Load all friendship rows involving the current user and join the other user's basic info
    const rows = await db
      .select({
        id: friendships.id,
        status: friendships.status,
        userId: friendships.userId,
        friendId: friendships.friendId,
        otherId: users.id,
        otherUsername: users.username,
        otherMinecraftUsername: users.minecraftUsername,
        otherLastSeenAt: users.lastSeenAt,
      })
      .from(friendships)
      .innerJoin(
        users,
        or(
          and(eq(friendships.userId, viewerId), eq(users.id, friendships.friendId)),
          and(eq(friendships.friendId, viewerId), eq(users.id, friendships.userId)),
        ),
      );

    const friends: any[] = [];
    const pending: any[] = [];

    for (const row of rows) {
      if (row.status === 'accepted') {
        friends.push({
          id: row.otherId,
          username: row.otherUsername,
          minecraftUsername: row.otherMinecraftUsername,
          status: isUserOnline(row.otherLastSeenAt) ? 'online' : 'offline',
          lastSeen: row.otherLastSeenAt,
        });
      } else if (row.status === 'pending') {
        const type: 'incoming' | 'outgoing' = row.userId === viewerId ? 'outgoing' : 'incoming';
        pending.push({
          id: row.otherId,
          username: row.otherUsername,
          minecraftUsername: row.otherMinecraftUsername,
          type,
        });
      }
    }

    return NextResponse.json({ friends, pending });
  } catch (error) {
    console.error('Error loading friends:', error);
    return NextResponse.json({ error: 'Failed to load friends' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetUserId, action } = await request.json();
    const viewerId = parseInt(session.user.id as string);
    const targetId = parseInt(String(targetUserId));

    if (!targetId || Number.isNaN(targetId)) {
      return NextResponse.json({ error: 'Invalid target user id' }, { status: 400 });
    }

    if (viewerId === targetId) {
      return NextResponse.json({ error: 'Cannot perform friend actions on yourself' }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.userId, viewerId), eq(friendships.friendId, targetId)),
          and(eq(friendships.userId, targetId), eq(friendships.friendId, viewerId)),
        ),
      )
      .limit(1);

    if (action === 'send') {
      if (existing) {
        // If already friends or pending, just echo status
        return NextResponse.json({ status: existing.status === 'accepted' ? 'friends' : 'pending' });
      }

      await db.insert(friendships).values({
        userId: viewerId,
        friendId: targetId,
        status: 'pending',
      });

      // Send notification to the target user
      const viewerName = session.user.name || session.user.username || 'Someone';
      await notifyFriendRequest(targetId, viewerName);

      return NextResponse.json({ status: 'pending' });
    }

    if (!existing) {
      // Nothing to cancel/remove/accept/decline
      return NextResponse.json({ status: 'none' });
    }

    if (action === 'cancel') {
      if (existing.status === 'pending') {
        await db
          .delete(friendships)
          .where(eq(friendships.id, existing.id));
      }
      return NextResponse.json({ status: 'none' });
    }

    if (action === 'remove') {
      if (existing.status === 'accepted') {
        await db
          .delete(friendships)
          .where(eq(friendships.id, existing.id));
      }
      return NextResponse.json({ status: 'none' });
    }

    if (action === 'accept') {
      // Only allow accepting if the current user is the recipient of a pending request
      if (existing.status === 'pending' && existing.friendId === viewerId) {
        await db
          .update(friendships)
          .set({ status: 'accepted' })
          .where(eq(friendships.id, existing.id));

        // Notify the original requester that their request was accepted
        const viewerName = session.user.name || session.user.username || 'Someone';
        await notifyFriendAccepted(existing.userId, viewerName);

        return NextResponse.json({ status: 'friends' });
      }
      return NextResponse.json({ status: existing.status === 'accepted' ? 'friends' : 'none' });
    }

    if (action === 'decline') {
      // Declining an incoming pending request simply deletes it
      if (existing.status === 'pending' && existing.friendId === viewerId) {
        await db
          .delete(friendships)
          .where(eq(friendships.id, existing.id));
      }
      return NextResponse.json({ status: 'none' });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('Error in /api/friends:', error);
    return NextResponse.json({ error: 'Failed to update friendship' }, { status: 500 });
  }
}
