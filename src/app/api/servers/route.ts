import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { servers } from '@/db/schema';
import { asc } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth-guard';

export async function GET() {
  try {
    // Only return available schema fields
    // Status data should ALWAYS be fetched from /api/servers/status (live from mcsrvstat.us)
    const allServers = await db
      .select({
        id: servers.id,
        name: servers.name,
        // description: null, // missing
        ipAddress: servers.ipAddress,
        port: servers.port,
        // modpackName: null, // missing
        // bluemapUrl: null, // missing
        // curseforgeUrl: null, // missing
        // orderIndex: 0, // missing
        createdAt: servers.createdAt,
        updatedAt: servers.updatedAt,
      })
      .from(servers)
      .orderBy(asc(servers.id));

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
    // Map legacy fields and ensure required fields
    const {
      name,
      description,
      ipAddress,
      address,
      port,
      hidePort,
      modpackName,
      bluemapUrl,
      curseforgeUrl,
      type,
      pterodactylServerId,
      pterodactylPanelUrl,
    } = body;

    const serverAddress = address || ipAddress;

    if (!name || !serverAddress) {
      return NextResponse.json(
        { error: 'Name and address are required' },
        { status: 400 }
      );
    }

    const [newServer] = await db.insert(servers).values({
      name,
      description: description || null,
      ipAddress: serverAddress,
      port: port || 25565,
      hidePort: hidePort || false,
      modpackName: modpackName || null,
      bluemapUrl: bluemapUrl || null,
      curseforgeUrl: curseforgeUrl || null,
      pterodactylServerId: pterodactylServerId || null,
      pterodactylPanelUrl: pterodactylPanelUrl || null,
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

