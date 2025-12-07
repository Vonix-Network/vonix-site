import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-guard';
import { getGlobalPterodactylConfig } from '@/lib/pterodactyl';

/**
 * GET /api/admin/pterodactyl/servers
 * List all servers accessible from the Pterodactyl panel (directly from API)
 */
export async function GET() {
    try {
        const { error } = await requirePermission('servers:read');
        if (error) return error;

        const config = await getGlobalPterodactylConfig();

        if (!config) {
            return NextResponse.json(
                { error: 'Pterodactyl is not configured' },
                { status: 400 }
            );
        }

        // Fetch servers directly from Pterodactyl Client API
        const response = await fetch(`${config.panelUrl.replace(/\/$/, '')}/api/client`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Pterodactyl API error:', errorText);
            return NextResponse.json(
                { error: 'Failed to fetch servers from Pterodactyl' },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Map server data
        const servers = (data.data || []).map((server: any) => ({
            identifier: server.attributes.identifier,
            uuid: server.attributes.uuid,
            name: server.attributes.name,
            description: server.attributes.description || '',
            node: server.attributes.node,
            allocation: server.attributes.relationships?.allocations?.data?.[0]?.attributes
                ? {
                    ip: server.attributes.relationships.allocations.data[0].attributes.ip,
                    port: server.attributes.relationships.allocations.data[0].attributes.port,
                }
                : null,
            limits: {
                memory: server.attributes.limits.memory,
                disk: server.attributes.limits.disk,
                cpu: server.attributes.limits.cpu,
            },
            featureLimits: {
                databases: server.attributes.feature_limits.databases,
                allocations: server.attributes.feature_limits.allocations,
                backups: server.attributes.feature_limits.backups,
            },
            isSuspended: server.attributes.is_suspended,
            isInstalling: server.attributes.is_installing,
        }));

        return NextResponse.json({
            success: true,
            servers,
        });
    } catch (error) {
        console.error('Error listing Pterodactyl servers:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to list servers' },
            { status: 500 }
        );
    }
}
