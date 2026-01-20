import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { servers, apiKeys } from '@/db/schema';
import { getServerStatus, getMultipleServerStatus } from '@/lib/minecraft-status';
import { pingServerNative } from '@/lib/minecraft-ping';
import { asc, eq, inArray, like } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // No caching - always fetch fresh

/**
 * GET /api/servers/status
 * Fetches live status for all servers or a specific server
 * 
 * Uses a hybrid approach:
 * 1. First tries native TCP ping (fastest, most reliable)
 * 2. Falls back to mcstatus.io API if native ping fails
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('id');
    const address = searchParams.get('address');
    const port = searchParams.get('port');

    // If specific server address provided, fetch just that one
    if (address) {
      const portNum = port ? parseInt(port) : 25565;

      // Try native ping first
      let result = await pingServerNative(address, portNum);

      // If native ping failed, try mcstatus.io API
      if (!result.success || !result.data?.online) {
        console.log(`[servers/status] Native ping failed for ${address}:${portNum}, trying API...`);
        result = await getServerStatus(address, portNum);
      }

      return NextResponse.json(result, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    // Fetch all servers from database
    const allServers = await db
      .select()
      .from(servers)
      .orderBy(asc(servers.id));

    if (allServers.length === 0) {
      return NextResponse.json({
        servers: [],
        message: 'No servers configured',
      });
    }

    // Fetch API keys for all servers
    const serverKeyNames = allServers.map((s: any) => `server_${s.id}_key`);
    const apiKeyMap = new Map<number, string>();

    try {
      console.log('[servers/status] Fetching API keys for:', serverKeyNames);
      const allApiKeys = await db
        .select()
        .from(apiKeys)
        .where(inArray(apiKeys.name, serverKeyNames));

      console.log('[servers/status] Found API keys:', allApiKeys.length);
      console.log('[servers/status] API keys data:', JSON.stringify(allApiKeys.map((k: any) => ({ name: k.name, hasKey: !!k.key }))));

      // Create a map of server ID -> API key
      for (const key of allApiKeys) {
        const match = key.name.match(/^server_(\d+)_key$/);
        if (match) {
          apiKeyMap.set(parseInt(match[1]), key.key);
          console.log('[servers/status] Mapped server', match[1], 'to key');
        }
      }
      console.log('[servers/status] API key map size:', apiKeyMap.size);
    } catch (error: any) {
      console.error('[servers/status] Error fetching API keys:', error.message);
      console.error('[servers/status] Full error:', error);
      // Continue without API keys rather than failing the whole request
    }

    // Ping all servers in parallel using hybrid approach
    const statusPromises = allServers.map(async (server: any) => {
      // Try native ping first
      let result = await pingServerNative(server.ipAddress, server.port);

      // If native ping failed, try mcstatus.io API
      if (!result.success || !result.data?.online) {
        console.log(`[servers/status] Native ping failed for ${server.ipAddress}:${server.port}, trying API...`);
        result = await getServerStatus(server.ipAddress, server.port, false);
      }

      return { server, result };
    });

    const results = await Promise.all(statusPromises);

    // Combine database info (static fields) with live status
    const serversWithStatus = results.map(({ server, result }) => {
      const data = result?.data;

      // Derive version string from the response
      const version = data?.version?.name_clean
        ?? data?.version?.name_raw
        ?? null;

      // Normalize player list to { name, uuid }
      const playerList = (data?.players?.list || []).map((p: any) => ({
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

      // Normalize icon: handle full data URLs
      let icon: string | null = data?.icon ?? null;
      if (icon && icon.startsWith('data:image')) {
        const commaIndex = icon.indexOf(',');
        icon = commaIndex !== -1 ? icon.slice(commaIndex + 1) : icon;
      }

      return {
        id: server.id,
        name: server.name,
        description: server.description,
        address: server.ipAddress,
        port: server.port,
        hidePort: server.hidePort,
        modpackName: server.modpackName,
        bluemapUrl: server.bluemapUrl,
        curseforgeUrl: server.curseforgeUrl,
        orderIndex: server.orderIndex,
        apiKey: apiKeyMap.get(Number(server.id)) || null,
        pterodactylServerId: server.pterodactylServerId,
        pterodactylPanelUrl: server.pterodactylPanelUrl,
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
        cachedAt: result?.cachedAt,
      };
    });

    return NextResponse.json({
      servers: serversWithStatus,
      fetchedAt: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('Error fetching server status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server status' },
      { status: 500 }
    );
  }
}

