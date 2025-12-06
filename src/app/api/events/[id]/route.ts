import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/db';
import { events, users } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get single event with attendees
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const eventId = parseInt(id);

    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const [event] = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        location: events.location,
        startTime: events.startTime,
        endTime: events.endTime,
        coverImage: events.banner,
        createdAt: events.createdAt,
        creatorId: events.hostId,
        creatorUsername: users.username,
        creatorMinecraft: users.minecraftUsername,
      })
      .from(events)
      .leftJoin(users, eq(events.hostId, users.id))
      .where(eq(events.id, eventId));

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Attendees functionality temporarily removed as table does not exist
    const attendees: any[] = [];
    const counts = {
      going: 0,
      interested: 0,
    };

    return NextResponse.json({ ...event, attendees, counts });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

// PUT - Update event
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const user = session?.user as any;

    if (!session || !['admin', 'superadmin', 'moderator'].includes(user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const eventId = parseInt(id);
    const body = await request.json();
    const { title, description, location, startTime, endTime, coverImage } = body;

    const [updated] = await db
      .update(events)
      .set({
        title,
        description,
        location,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        banner: coverImage,
      })
      .where(eq(events.id, eventId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

// DELETE - Delete event
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const user = session?.user as any;

    if (!session || !['admin', 'superadmin'].includes(user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const eventId = parseInt(id);

    await db.delete(events).where(eq(events.id, eventId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}

// PATCH - RSVP to event
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return NextResponse.json({ error: 'RSVP functionality currently unavailable' }, { status: 501 });
}
