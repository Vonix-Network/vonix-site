import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-guard';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ identifier: string }> }
) {
    try {
        const { error } = await requirePermission('servers:read');
        if (error) return error;

        const { identifier } = await params;

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

        // Fetch server details to get allocation
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

        // Get the IP and port
        const ip = allocation.ip_alias || allocation.ip;
        const port = allocation.port;

        console.log(`[players] Getting players for ${ip}:${port}`);

        // Method 1: Try native TCP ping first (fastest)
        try {
            const { pingServerNative } = await import('@/lib/minecraft-ping');
            const nativeResult = await pingServerNative(ip, port);

            if (nativeResult.success && nativeResult.data?.online) {
                const playerList = extractPlayerNames(nativeResult.data.players);
                console.log(`[players] Native ping success: ${nativeResult.data.players?.online || 0} players`);
                return NextResponse.json({
                    online: true,
                    players: {
                        online: nativeResult.data.players?.online || 0,
                        max: nativeResult.data.players?.max || 0,
                        list: playerList,
                    },
                    source: 'native'
                });
            }
        } catch (e) {
            console.log(`[players] Native ping failed: ${e}`);
        }

        // Method 2: Try mcstatus.io API
        try {
            const { getServerStatus } = await import('@/lib/minecraft-status');
            const mcstatusResult = await getServerStatus(ip, port);

            if (mcstatusResult.success && mcstatusResult.data?.online) {
                const playerList = extractPlayerNames(mcstatusResult.data.players);
                console.log(`[players] mcstatus.io success: ${mcstatusResult.data.players?.online || 0} players`);
                return NextResponse.json({
                    online: true,
                    players: {
                        online: mcstatusResult.data.players?.online || 0,
                        max: mcstatusResult.data.players?.max || 0,
                        list: playerList,
                    },
                    source: 'mcstatus.io'
                });
            }
        } catch (e) {
            console.log(`[players] mcstatus.io failed: ${e}`);
        }

        // Method 3: Try mcsrvstat.us API
        try {
            const mcsrvstatResult = await fetchMcsrvstat(ip, port);
            if (mcsrvstatResult.online) {
                console.log(`[players] mcsrvstat.us success: ${mcsrvstatResult.players?.online || 0} players`);
                return NextResponse.json({
                    online: true,
                    players: {
                        online: mcsrvstatResult.players?.online || 0,
                        max: mcsrvstatResult.players?.max || 0,
                        list: mcsrvstatResult.players?.list || [],
                    },
                    source: 'mcsrvstat.us'
                });
            }
        } catch (e) {
            console.log(`[players] mcsrvstat.us failed: ${e}`);
        }

        console.log(`[players] All methods failed for ${ip}:${port}`);
        return NextResponse.json({
            online: false,
            players: { online: 0, max: 0, list: [] },
            source: 'none'
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

// Extract player names from various response formats
function extractPlayerNames(players: any): string[] {
    if (!players) return [];

    const names: string[] = [];

    // Handle list format (from native ping)
    if (players.list && Array.isArray(players.list)) {
        for (const player of players.list) {
            if (typeof player === 'string') {
                names.push(player);
            } else if (player.name_clean) {
                names.push(player.name_clean);
            } else if (player.name_raw) {
                names.push(player.name_raw);
            } else if (player.name) {
                names.push(player.name);
            }
        }
    }

    // Handle sample format (from some APIs)
    if (players.sample && Array.isArray(players.sample)) {
        for (const player of players.sample) {
            const name = player.name || player.name_clean || '';
            if (name && !names.includes(name)) {
                names.push(name);
            }
        }
    }

    return names.filter(n => n && n !== 'Unknown');
}

// Fetch from mcsrvstat.us API
async function fetchMcsrvstat(ip: string, port: number): Promise<{
    online: boolean;
    players?: { online: number; max: number; list: string[] };
}> {
    const address = port === 25565 ? ip : `${ip}:${port}`;
    const response = await fetch(`https://api.mcsrvstat.us/2/${address}`, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 30 }
    });

    if (!response.ok) {
        throw new Error(`mcsrvstat.us returned ${response.status}`);
    }

    const data = await response.json();

    return {
        online: data.online === true,
        players: data.online ? {
            online: data.players?.online || 0,
            max: data.players?.max || 0,
            list: data.players?.list || [],
        } : undefined,
    };
}
