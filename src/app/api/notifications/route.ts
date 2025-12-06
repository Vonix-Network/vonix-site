import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * GET /api/notifications - Get user's notifications
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const userId = parseInt(session.user.id as string);
    
    let query = db
      .select()
      .from(notifications)
      .where(
        unreadOnly
          ? and(eq(notifications.userId, userId), eq(notifications.read, false))
          : eq(notifications.userId, userId)
      )
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    const userNotifications = await query;

    // Get unread count
    const unreadNotifications = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

    return NextResponse.json({
      notifications: userNotifications,
      unreadCount: unreadNotifications.length,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications - Mark notifications as read
 * Body: { ids: number[] } or { all: true }
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string);
    const body = await request.json();
    
    if (body.all === true) {
      // Mark all notifications as read
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.userId, userId));
      
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }
    
    if (Array.isArray(body.ids) && body.ids.length > 0) {
      // Mark specific notifications as read
      for (const id of body.ids) {
        await db
          .update(notifications)
          .set({ read: true })
          .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
      }
      
      return NextResponse.json({ success: true, message: `${body.ids.length} notification(s) marked as read` });
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications - Delete notifications
 * Body: { ids: number[] } or { all: true }
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string);
    const body = await request.json();
    
    if (body.all === true) {
      // Delete all notifications
      await db
        .delete(notifications)
        .where(eq(notifications.userId, userId));
      
      return NextResponse.json({ success: true, message: 'All notifications deleted' });
    }
    
    if (Array.isArray(body.ids) && body.ids.length > 0) {
      // Delete specific notifications
      for (const id of body.ids) {
        await db
          .delete(notifications)
          .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
      }
      
      return NextResponse.json({ success: true, message: `${body.ids.length} notification(s) deleted` });
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 });
  }
}


