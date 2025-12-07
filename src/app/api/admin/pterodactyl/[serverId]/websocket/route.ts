import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/db';
import { servers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getGlobalPterodactylConfig, PterodactylConfig } from '@/lib/pterodactyl';

/**
 * GET /api/admin/pterodactyl/[serverId]/websocket
 * Get WebSocket credentials for console connection
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ serverId: string }> }
) {
    try {
        const { error } = await requirePermission('servers:read');
        if (error) return error;

        const { serverId } = await params;
        const serverIdNum = parseInt(serverId, 10);

        if (isNaN(serverIdNum)) {
            return NextResponse.json({ error: 'Invalid server ID' }, { status: 400 });
        }

        // Get server config
        const server = await db.query.servers.findFirst({
            where: eq(servers.id, serverIdNum),
        });

        if (!server?.pterodactylServerId) {
            return NextResponse.json(
                { error: 'Pterodactyl not configured for this server' },
                { status: 404 }
            );
        }

        // Get global config for API key
        const globalConfig = await getGlobalPterodactylConfig();
        if (!globalConfig) {
            return NextResponse.json(
                { error: 'Pterodactyl not configured' },
                { status: 400 }
            );
        }

        const panelUrl = server.pterodactylPanelUrl || globalConfig.panelUrl;

        // Fetch WebSocket credentials from Pterodactyl
        const wsUrl = `${panelUrl.replace(/\/$/, '')}/api/client/servers/${server.pterodactylServerId}/websocket`;

        const response = await fetch(wsUrl, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${globalConfig.apiKey}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Pterodactyl WebSocket error:', errorText);
            return NextResponse.json(
                { error: 'Failed to get WebSocket credentials' },
                { status: response.status }
            );
        }

        const data = await response.json();

        return NextResponse.json({
            success: true,
            socket: data.data.socket,
            token: data.data.token,
        });
    } catch (error) {
        console.error('Error fetching WebSocket credentials:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get WebSocket credentials' },
            { status: 500 }
        );
    }
}
