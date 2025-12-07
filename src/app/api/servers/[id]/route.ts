import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { servers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth-guard';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get single server
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const serverId = parseInt(id);

    if (isNaN(serverId)) {
      return NextResponse.json({ error: 'Invalid server ID' }, { status: 400 });
    }

    const [server] = await db
      .select()
      .from(servers)
      .where(eq(servers.id, serverId));

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    return NextResponse.json(server);
  } catch (error) {
    console.error('Error fetching server:', error);
    return NextResponse.json({ error: 'Failed to fetch server' }, { status: 500 });
  }
}

// PUT - Update server
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { error } = await requirePermission('servers:write');
    if (error) return error;

    const { id } = await params;
    const serverId = parseInt(id);
    const body = await request.json();

    // Map usage of legacy fields to current schema
    const {
      name, ipAddress, address, port, type, bluemapUrl
    } = body;

    const serverAddress = address || ipAddress;

    const [updated] = await db
      .update(servers)
      .set({
        name,
        ipAddress: serverAddress,
        port,
        bluemapUrl: bluemapUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(servers.id, serverId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating server:', error);
    return NextResponse.json({ error: 'Failed to update server' }, { status: 500 });
  }
}

// DELETE - Delete server
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { error } = await requirePermission('servers:delete');
    if (error) return error;

    const { id } = await params;
    const serverId = parseInt(id);

    const [deleted] = await db
      .delete(servers)
      .where(eq(servers.id, serverId))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting server:', error);
    return NextResponse.json({ error: 'Failed to delete server' }, { status: 500 });
  }
}
