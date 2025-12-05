import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { servers } from '@/db/schema';
import { asc } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth-guard';

export async function GET() {
  try {
    // Only return static configuration fields
    // Status data should ALWAYS be fetched from /api/servers/status (live from mcsrvstat.us)
    const allServers = await db
      .select({
        id: servers.id,
        name: servers.name,
        description: servers.description,
        ipAddress: servers.ipAddress,
        port: servers.port,
        modpackName: servers.modpackName,
        bluemapUrl: servers.bluemapUrl,
        curseforgeUrl: servers.curseforgeUrl,
        orderIndex: servers.orderIndex,
        createdAt: servers.createdAt,
        updatedAt: servers.updatedAt,
      })
      .from(servers)
      .orderBy(asc(servers.orderIndex));

    return NextResponse.json(allServers);
  } catch (error) {
    console.error('Error fetching servers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch servers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requirePermission('servers:write');
    if (error) return error;

    const body = await request.json();
    const { name, description, ipAddress, port, hidePort, modpackName, bluemapUrl, curseforgeUrl } = body;

    if (!name || !ipAddress) {
      return NextResponse.json(
        { error: 'Name and IP address are required' },
        { status: 400 }
      );
    }

    const [newServer] = await db.insert(servers).values({
      name,
      description,
      ipAddress,
      port: port || 25565,
      hidePort: hidePort || false,
      modpackName,
      bluemapUrl,
      curseforgeUrl,
      status: 'offline',
      playersOnline: 0,
      playersMax: 0,
    }).returning();

    return NextResponse.json(newServer, { status: 201 });
  } catch (error) {
    console.error('Error creating server:', error);
    return NextResponse.json(
      { error: 'Failed to create server' },
      { status: 500 }
    );
  }
}
