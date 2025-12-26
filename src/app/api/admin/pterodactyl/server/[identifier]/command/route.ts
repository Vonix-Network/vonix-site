import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-guard';
import { getGlobalPterodactylConfig } from '@/lib/pterodactyl';

/**
 * POST /api/admin/pterodactyl/server/[identifier]/command
 * Send a command to the server console via HTTP
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ identifier: string }> }
) {
    try {
        const { error } = await requirePermission('servers:write');
        if (error) return error;

        const { identifier } = await params;
        const body = await request.json();
        const { command } = body;

        if (!command || typeof command !== 'string') {
            return NextResponse.json(
                { error: 'Command is required' },
                { status: 400 }
            );
        }

        const config = await getGlobalPterodactylConfig();
        if (!config) {
            return NextResponse.json(
                { error: 'Pterodactyl is not configured' },
                { status: 400 }
            );
        }

        // Send command via Pterodactyl API
        const response = await fetch(
            `${config.panelUrl.replace(/\/$/, '')}/api/client/servers/${identifier}/command`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                },
                body: JSON.stringify({ command }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Pterodactyl command error:', errorText);
            return NextResponse.json(
                { error: 'Failed to send command' },
                { status: response.status }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Command sent successfully',
        });
    } catch (error: any) {
        console.error('Error sending command:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to send command' },
            { status: 500 }
        );
    }
}
