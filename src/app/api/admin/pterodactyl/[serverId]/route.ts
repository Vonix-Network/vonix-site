import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-guard';
import { db } from '@/db';
import { servers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
    getGlobalPterodactylConfig,
    getServerDetails,
    getServerResources,
    sendPowerAction,
    sendCommand,
    PowerAction,
    PterodactylConfig,
} from '@/lib/pterodactyl';

/**
 * Get the Pterodactyl config for a specific server
 * Uses server-specific URL if set, otherwise falls back to global config
 */
async function getServerPterodactylConfig(
    serverId: number
): Promise<{ config: PterodactylConfig; pterodactylServerId: string } | null> {
    const server = await db.query.servers.findFirst({
        where: eq(servers.id, serverId),
    });

    if (!server?.pterodactylServerId) {
        return null;
    }

    // Check for server-specific panel URL first
    if (server.pterodactylPanelUrl) {
        const globalConfig = await getGlobalPterodactylConfig();
        if (!globalConfig?.apiKey) {
            return null;
        }
        return {
            config: {
                panelUrl: server.pterodactylPanelUrl,
                apiKey: globalConfig.apiKey,
            },
            pterodactylServerId: server.pterodactylServerId,
        };
    }

    // Fall back to global config
    const globalConfig = await getGlobalPterodactylConfig();
    if (!globalConfig) {
        return null;
    }

    return {
        config: globalConfig,
        pterodactylServerId: server.pterodactylServerId,
    };
}

/**
 * GET /api/admin/pterodactyl/[serverId]
 * Get server details and current resource usage
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

        const pterodactylInfo = await getServerPterodactylConfig(serverIdNum);

        if (!pterodactylInfo) {
            return NextResponse.json(
                { error: 'Pterodactyl not configured for this server' },
                { status: 404 }
            );
        }

        const { config, pterodactylServerId } = pterodactylInfo;

        // Fetch both details and resources in parallel
        const [details, resources] = await Promise.all([
            getServerDetails(config, pterodactylServerId),
            getServerResources(config, pterodactylServerId),
        ]);

        return NextResponse.json({
            success: true,
            details,
            resources,
        });
    } catch (error: any) {
        console.error('Error fetching Pterodactyl server info:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch server info' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/pterodactyl/[serverId]
 * Send a power action or command to the server
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ serverId: string }> }
) {
    try {
        const { error } = await requirePermission('servers:write');
        if (error) return error;

        const { serverId } = await params;
        const serverIdNum = parseInt(serverId, 10);

        if (isNaN(serverIdNum)) {
            return NextResponse.json({ error: 'Invalid server ID' }, { status: 400 });
        }

        const body = await request.json();
        const { action, command } = body;

        const pterodactylInfo = await getServerPterodactylConfig(serverIdNum);

        if (!pterodactylInfo) {
            return NextResponse.json(
                { error: 'Pterodactyl not configured for this server' },
                { status: 404 }
            );
        }

        const { config, pterodactylServerId } = pterodactylInfo;

        // Handle power actions
        if (action) {
            const validActions: PowerAction[] = ['start', 'stop', 'restart', 'kill'];
            if (!validActions.includes(action)) {
                return NextResponse.json(
                    { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
                    { status: 400 }
                );
            }

            await sendPowerAction(config, pterodactylServerId, action);

            return NextResponse.json({
                success: true,
                message: `Power action '${action}' sent successfully`,
            });
        }

        // Handle console commands
        if (command) {
            await sendCommand(config, pterodactylServerId, command);

            return NextResponse.json({
                success: true,
                message: 'Command sent successfully',
            });
        }

        return NextResponse.json(
            { error: 'Either action or command is required' },
            { status: 400 }
        );
    } catch (error: any) {
        console.error('Error executing Pterodactyl action:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to execute action' },
            { status: 500 }
        );
    }
}
