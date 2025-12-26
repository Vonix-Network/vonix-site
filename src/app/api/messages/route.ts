import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { db } from '@/db';
import { privateMessages, users } from '@/db/schema';
import { and, or, eq, desc, inArray } from 'drizzle-orm';
import { notifyNewMessage } from '@/lib/notifications';
import { emitNewMessage } from '@/lib/socket-emit';
import { sendUserNotificationEmail, getNewMessageEmailTemplate } from '@/lib/email';
import { sanitizeContent } from '@/lib/sanitize';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const viewerId = parseInt(session.user.id as string);
    const { searchParams } = new URL(request.url);
    const withUserIdParam = searchParams.get('withUserId');

    if (withUserIdParam) {
      // Load direct conversation with a specific user
      const otherId = parseInt(withUserIdParam);
      if (!otherId || Number.isNaN(otherId)) {
        return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
      }

      const messages = await db
        .select()
        .from(privateMessages)
        .where(
          or(
            and(eq(privateMessages.senderId, viewerId), eq(privateMessages.recipientId, otherId)),
            and(eq(privateMessages.senderId, otherId), eq(privateMessages.recipientId, viewerId)),
          ),
        )
        .orderBy(desc(privateMessages.createdAt))
        .limit(100);

      return NextResponse.json({ messages: messages.reverse() });
    }

    // Otherwise, return a list of conversations (one per user)
    const messages = await db
      .select({
        id: privateMessages.id,
        senderId: privateMessages.senderId,
        recipientId: privateMessages.recipientId,
        content: privateMessages.content,
        createdAt: privateMessages.createdAt,
      })
      .from(privateMessages)
      .where(
        or(eq(privateMessages.senderId, viewerId), eq(privateMessages.recipientId, viewerId)),
      )
      .orderBy(desc(privateMessages.createdAt))
      .limit(200);

    // Build conversation summaries by latest message per other user
    const latestByUser = new Map<number, (typeof messages)[number]>();

    for (const m of messages) {
      const otherId = m.senderId === viewerId ? m.recipientId : m.senderId;
      const existing = latestByUser.get(otherId);
      if (!existing || (existing.createdAt as any) < (m.createdAt as any)) {
        latestByUser.set(otherId, m);
      }
    }

    const otherUserIds = Array.from(latestByUser.keys());

    if (otherUserIds.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    const otherUsers = await db
      .select({ id: users.id, username: users.username, minecraftUsername: users.minecraftUsername })
      .from(users)
      .where(inArray(users.id, otherUserIds));

    const userMap = new Map<number, (typeof otherUsers)[number]>();
    for (const u of otherUsers) userMap.set(u.id, u);

    const conversations = Array.from(latestByUser.entries()).map(([otherId, m]) => {
      const other = userMap.get(otherId)!;
      return {
        id: otherId,
        user: {
          id: other.id,
          username: other.username,
          minecraftUsername: other.minecraftUsername,
        },
        lastMessage: m.content,
        lastMessageTime: m.createdAt,
      };
    });

    return NextResponse.json({ conversations });
  } catch (error: any) {
    console.error('Error loading messages:', error);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const viewerId = parseInt(session.user.id as string);
    const body = await request.json();
    const { recipientId } = body;

    // Sanitize message content
    const content = sanitizeContent(body.content, 2000);

    const targetId = parseInt(String(recipientId));
    if (!targetId || Number.isNaN(targetId)) {
      return NextResponse.json({ error: 'Invalid recipient id' }, { status: 400 });
    }

    if (!content) {
      return NextResponse.json({ error: 'Message content required' }, { status: 400 });
    }

    const [inserted] = await db
      .insert(privateMessages)
      .values({ senderId: viewerId, recipientId: targetId, content })
      .returning();

    // Emit via socket for real-time delivery
    emitNewMessage(viewerId, targetId, inserted);

    // Send notification to the recipient
    const senderName = session.user.name || session.user.username || 'Someone';
    await notifyNewMessage(targetId, senderName);

    // Send email notification (async, don't wait)
    const messagePreview = content.substring(0, 200);
    sendUserNotificationEmail(
      targetId,
      'message',
      getNewMessageEmailTemplate(senderName, messagePreview)
    ).catch(err => console.error('Failed to send message email:', err));

    return NextResponse.json(inserted, { status: 201 });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

