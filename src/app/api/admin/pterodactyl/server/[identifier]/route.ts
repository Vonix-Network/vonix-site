import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-guard';
import { getGlobalPterodactylConfig } from '@/lib/pterodactyl';

/**
 * GET /api/admin/pterodactyl/server/[identifier]
 * Get server resources directly using Pterodactyl server identifier
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ identifier: string }> }
) {
    try {
        const { error } = await requirePermission('servers:read');
        if (error) return error;

        const { identifier } = await params;

        const config = await getGlobalPterodactylConfig();
        if (!config) {
            return NextResponse.json(
                { error: 'Pterodactyl is not configured' },
                { status: 400 }
            );
        }

        // Fetch server resources
        const response = await fetch(
            `${config.panelUrl.replace(/\/$/, '')}/api/client/servers/${identifier}/resources`,
            {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Pterodactyl API error:', errorText);
            return NextResponse.json(
                { error: 'Failed to fetch server resources' },
                { status: response.status }
            );
        }

        const data = await response.json();
        const attr = data.attributes;

        return NextResponse.json({
            success: true,
            resources: {
                currentState: attr.current_state,
                isSuspended: attr.is_suspended,
                resources: {
                    memoryBytes: attr.resources.memory_bytes,
                    cpuAbsolute: attr.resources.cpu_absolute,
                    diskBytes: attr.resources.disk_bytes,
                    networkRxBytes: attr.resources.network_rx_bytes,
                    networkTxBytes: attr.resources.network_tx_bytes,
                    uptime: attr.resources.uptime,
                },
            },
        });
    } catch (error) {
        console.error('Error fetching Pterodactyl server resources:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch server resources' },
            { status: 500 }
        );
    }
}
