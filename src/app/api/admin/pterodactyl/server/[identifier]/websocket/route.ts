import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-guard';
import { getGlobalPterodactylConfig } from '@/lib/pterodactyl';

/**
 * GET /api/admin/pterodactyl/server/[identifier]/websocket
 * Get WebSocket credentials for console connection
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

        // Fetch WebSocket credentials
        const response = await fetch(
            `${config.panelUrl.replace(/\/$/, '')}/api/client/servers/${identifier}/websocket`,
            {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                },
            }
        );

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
