import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-guard';

// Minecraft server query using TCP status ping
async function queryMinecraftServer(host: string, port: number): Promise<{
    online: boolean;
    players: { online: number; max: number; list: string[] };
} | null> {
    try {
        // Use the ping protocol to get server status
        const response = await fetch(`https://api.mcsrvstat.us/2/${host}:${port}`, {
            next: { revalidate: 0 },
        });

        if (!response.ok) return null;

        const data = await response.json();

        if (!data.online) {
            return { online: false, players: { online: 0, max: 0, list: [] } };
        }

        return {
            online: true,
            players: {
                online: data.players?.online || 0,
                max: data.players?.max || 0,
                list: data.players?.list || [],
            },
        };
    } catch (error) {
        console.error('Failed to query Minecraft server:', error);
        return null;
    }
}

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
            return NextResponse.json({ error: 'Failed to fetch server details' }, { status: serverRes.status });
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

        // Query the Minecraft server
        const ip = allocation.ip_alias || allocation.ip;
        const port = allocation.port;

        const result = await queryMinecraftServer(ip, port);

        if (!result) {
            return NextResponse.json({
                online: false,
                players: { online: 0, max: 0, list: [] }
            });
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error('Error fetching players:', error);
        return NextResponse.json({
            error: 'Failed to fetch player data',
            online: false,
            players: { online: 0, max: 0, list: [] }
        }, { status: 500 });
    }
}
