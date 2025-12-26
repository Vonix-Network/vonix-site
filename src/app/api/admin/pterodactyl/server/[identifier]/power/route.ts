import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-guard';
import { getGlobalPterodactylConfig } from '@/lib/pterodactyl';

/**
 * POST /api/admin/pterodactyl/server/[identifier]/power
 * Send power action to server
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
        const { action } = body;

        const validActions = ['start', 'stop', 'restart', 'kill'];
        if (!validActions.includes(action)) {
            return NextResponse.json(
                { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
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

        // Send power action
        const response = await fetch(
            `${config.panelUrl.replace(/\/$/, '')}/api/client/servers/${identifier}/power`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                },
                body: JSON.stringify({ signal: action }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Pterodactyl API error:', errorText);
            return NextResponse.json(
                { error: `Failed to send power action: ${action}` },
                { status: response.status }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Power action '${action}' sent successfully`,
        });
    } catch (error: any) {
        console.error('Error sending power action:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to send power action' },
            { status: 500 }
        );
    }
}
