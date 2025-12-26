import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { db } from '@/db';
import { events, users } from '@/db/schema';
import { eq, desc, gte, sql } from 'drizzle-orm';

// Force dynamic - always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - List events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const upcoming = searchParams.get('upcoming') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    let query = db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        location: events.location,
        startTime: events.startTime,
        endTime: events.endTime,
        coverImage: events.coverImage,
        createdAt: events.createdAt,
        creatorId: events.creatorId,
        creatorUsername: users.username,
        creatorMinecraft: users.minecraftUsername,
        // attendeeCount removed as table doesn't exist
        attendeeCount: sql<number>`0`,
      })
      .from(events)
      .leftJoin(users, eq(events.creatorId, users.id))
      .orderBy(desc(events.startTime))
      .limit(limit);

    const allEvents = await query;

    // Filter upcoming if requested
    const filteredEvents = upcoming
      ? allEvents.filter((e) => e.startTime && e.startTime > new Date())
      : allEvents;

    return NextResponse.json(filteredEvents);
  } catch (error: any) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// POST - Create event
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;

    if (!session || !['admin', 'superadmin', 'moderator'].includes(user?.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Only staff can create events' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, location, startTime, endTime, coverImage } = body;

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Title, start time, and end time are required' },
        { status: 400 }
      );
    }

    const [newEvent] = await db
      .insert(events)
      .values({
        title,
        description: description || '',
        location: location || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        coverImage: coverImage || null,
        creatorId: parseInt(user.id),
      })
      .returning();

    return NextResponse.json(newEvent, { status: 201 });
  } catch (error: any) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}

