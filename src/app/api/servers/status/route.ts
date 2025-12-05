import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { servers } from '@/db/schema';
import { getServerStatus, getMultipleServerStatus } from '@/lib/minecraft-status';
import { asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every 60 seconds

/**
 * GET /api/servers/status
 * Fetches live status for all servers or a specific server
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('id');
    const address = searchParams.get('address');
    const port = searchParams.get('port');

    // If specific server address provided, fetch just that one
    if (address) {
      const result = await getServerStatus(
        address,
        port ? parseInt(port) : 25565
      );

      return NextResponse.json(result, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      });
    }

    // Fetch all servers from database
    const allServers = await db
      .select()
      .from(servers)
      .orderBy(asc(servers.orderIndex));

    if (allServers.length === 0) {
      return NextResponse.json({
        servers: [],
        message: 'No servers configured',
      });
    }

    // Fetch status for all servers
    const serverList = allServers.map((s) => ({
      address: s.ipAddress,
      port: s.port,
      isBedrock: false, // Add isBedrock field to servers table if needed
    }));

    const statusResults = await getMultipleServerStatus(serverList);

    // Combine database info (static fields) with live status ONLY for dynamic data
    const serversWithStatus = allServers.map((server) => {
      const key = `${server.ipAddress}:${server.port}`;
      const status = statusResults.get(key);
      const data = status?.data;

      // Derive version string from mcstatus.io structure
      const version = data?.version?.name_clean
        ?? data?.version?.name_raw
        ?? null;

      // Normalize player list to { name, uuid }
      const playerList = (data?.players?.list || []).map((p) => ({
        name: p.name_clean || p.name_raw || 'Unknown',
        uuid: p.uuid || '',
      }));

      // Build MOTD from clean/raw, handling both string and string[] shapes
      let motd = '';
      const cleanMotd: string | string[] | undefined = data?.motd?.clean as any;
      const rawMotd: string | string[] | undefined = data?.motd?.raw as any;

      if (cleanMotd) {
        motd = Array.isArray(cleanMotd) ? cleanMotd.join(' ') : String(cleanMotd);
      } else if (rawMotd) {
        motd = Array.isArray(rawMotd) ? rawMotd.join(' ') : String(rawMotd);
      }

      // Normalize icon: mcstatus.io often returns a full data URL (e.g. "data:image/png;base64,....").
      // The frontend expects just the raw base64 payload and adds its own data:image/png;base64, prefix.
      let icon: string | null = data?.icon ?? null;
      if (icon && icon.startsWith('data:image')) {
        const commaIndex = icon.indexOf(',');
        icon = commaIndex !== -1 ? icon.slice(commaIndex + 1) : icon;
      }

      return {
        id: server.id,
        name: server.name,
        description: server.description,
        ipAddress: server.ipAddress,
        port: server.port,
        hidePort: server.hidePort, // For SRV records - hide port in display
        modpackName: server.modpackName,
        bluemapUrl: server.bluemapUrl,
        curseforgeUrl: server.curseforgeUrl,
        orderIndex: server.orderIndex,
        apiKey: server.apiKey, // For admin XP sync configuration
        // Live status data ONLY (no DB fallbacks for dynamic fields)
        online: data?.online ?? false,
        version,
        players: {
          online: data?.players?.online ?? 0,
          max: data?.players?.max ?? 0,
          list: playerList,
        },
        motd,
        icon,
        cachedAt: status?.cachedAt,
      };
    });

    return NextResponse.json({
      servers: serversWithStatus,
      fetchedAt: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    console.error('Error fetching server status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server status' },
      { status: 500 }
    );
  }
}
