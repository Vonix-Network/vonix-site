import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-guard';
import { getGlobalPterodactylConfig } from '@/lib/pterodactyl';

/**
 * GET /api/admin/pterodactyl/server/[identifier]/startup
 * Get startup variables
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
            return NextResponse.json({ error: 'Pterodactyl is not configured' }, { status: 400 });
        }

        const response = await fetch(
            `${config.panelUrl.replace(/\/$/, '')}/api/client/servers/${identifier}/startup`,
            {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                },
            }
        );

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to get startup variables' }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json({
            success: true,
            variables: data.data.map((v: any) => ({
                name: v.attributes.name,
                description: v.attributes.description,
                envVariable: v.attributes.env_variable,
                defaultValue: v.attributes.default_value,
                serverValue: v.attributes.server_value,
                isEditable: v.attributes.is_editable,
                rules: v.attributes.rules,
            })),
        });
    } catch (error) {
        console.error('Error getting startup variables:', error);
        return NextResponse.json({ error: 'Failed to get startup variables' }, { status: 500 });
    }
}

/**
 * PUT /api/admin/pterodactyl/server/[identifier]/startup
 * Update startup variable
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ identifier: string }> }
) {
    try {
        const { error } = await requirePermission('servers:write');
        if (error) return error;

        const { identifier } = await params;
        const body = await request.json();

        const config = await getGlobalPterodactylConfig();
        if (!config) {
            return NextResponse.json({ error: 'Pterodactyl is not configured' }, { status: 400 });
        }

        const response = await fetch(
            `${config.panelUrl.replace(/\/$/, '')}/api/client/servers/${identifier}/startup/variable`,
            {
                method: 'PUT',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                },
                body: JSON.stringify({
                    key: body.key,
                    value: body.value,
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json({ error: errorData.errors?.[0]?.detail || 'Failed to update variable' }, { status: response.status });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating startup variable:', error);
        return NextResponse.json({ error: 'Failed to update startup variable' }, { status: 500 });
    }
}
