import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-guard';
import { pingServerNative } from '@/lib/minecraft-ping';
import { getServerStatus } from '@/lib/minecraft-status';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ identifier: string }> }
) {
    const permissionResult = await requirePermission('servers:read');
    if ('error' in permissionResult) {
        return NextResponse.json({ error: permissionResult.error }, { status: permissionResult.status });
    }

    const { identifier } = await params;

    try {
        // Get server details from Pterodactyl to find the IP/port
        const { db } = await import('@/db');
        const { siteSettings } = await import('@/db/schema');
        const { eq } = await import('drizzle-orm');

        const panelUrlSetting = await db.query.siteSettings.findFirst({
            where: eq(siteSettings.key, 'pterodactyl_panel_url'),
        });
        const apiKeySetting = await db.query.siteSettings.findFirst({
            where: eq(siteSettings.key, 'pterodactyl_api_key'),
        });

        if (!panelUrlSetting?.value || !apiKeySetting?.value) {
            return NextResponse.json({ error: 'Pterodactyl not configured' }, { status: 400 });
        }

        const panelUrl = panelUrlSetting.value.replace(/\/$/, '');

        // Fetch server details
        const serverRes = await fetch(`${panelUrl}/api/client/servers/${identifier}`, {
            headers: {
                'Authorization': `Bearer ${apiKeySetting.value}`,
                'Accept': 'application/json',
            },
        });

        if (!serverRes.ok) {
            return NextResponse.json({
                error: 'Failed to fetch server details',
                online: false,
                players: { online: 0, max: 0, list: [] }
            }, { status: serverRes.status });
        }

        const serverData = await serverRes.json();
        const allocation = serverData.attributes?.relationships?.allocations?.data?.[0]?.attributes;

        if (!allocation) {
            return NextResponse.json({
                online: false,
                players: { online: 0, max: 0, list: [] },
                error: 'No allocation found'
            });
        }

        // Get the IP and port - use ip_alias if available (usually the public hostname)
        const ip = allocation.ip_alias || allocation.ip;
        const port = allocation.port;

        console.log(`[players] Attempting to get players for ${ip}:${port}`);

        // Try native ping first (fastest, most reliable)
        let result = await pingServerNative(ip, port);

        // If native ping failed, try mcstatus.io API
        if (!result.success || !result.data?.online) {
            console.log(`[players] Native ping failed, trying mcstatus.io API for ${ip}:${port}`);
            result = await getServerStatus(ip, port);
        }

        if (result.success && result.data) {
            // Extract player names from the result
            // The ping result has players.list as array of {name_raw, name_clean, uuid}
            const playerList: string[] = [];

            if (result.data.players?.list && Array.isArray(result.data.players.list)) {
                for (const player of result.data.players.list) {
                    // Handle both formats: { name_clean } from native ping or { name } from API
                    const name = player.name_clean || player.name_raw || player.name || 'Unknown';
                    if (name && name !== 'Unknown') {
                        playerList.push(name);
                    }
                }
            }

            // Also check for sample format (used by some APIs)
            if (result.data.players?.sample && Array.isArray(result.data.players.sample)) {
                for (const player of result.data.players.sample) {
                    const name = player.name || player.name_clean || 'Unknown';
                    if (name && name !== 'Unknown' && !playerList.includes(name)) {
                        playerList.push(name);
                    }
                }
            }

            console.log(`[players] Got ${result.data.players?.online || 0} players online, ${playerList.length} names`);

            return NextResponse.json({
                online: result.data.online,
                players: {
                    online: result.data.players?.online || 0,
                    max: result.data.players?.max || 0,
                    list: playerList,
                },
            });
        }

        console.log(`[players] Failed to get player data for ${ip}:${port}`);
        return NextResponse.json({
            online: false,
            players: { online: 0, max: 0, list: [] }
        });

    } catch (error) {
        console.error('Error fetching players:', error);
        return NextResponse.json({
            error: 'Failed to fetch player data',
            online: false,
            players: { online: 0, max: 0, list: [] }
        }, { status: 500 });
    }
}
