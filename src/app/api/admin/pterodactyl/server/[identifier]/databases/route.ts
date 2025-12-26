import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-guard';
import { getGlobalPterodactylConfig } from '@/lib/pterodactyl';

/**
 * GET /api/admin/pterodactyl/server/[identifier]/databases
 * List databases
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
            `${config.panelUrl.replace(/\/$/, '')}/api/client/servers/${identifier}/databases`,
            {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                },
            }
        );

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to list databases' }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json({
            success: true,
            databases: data.data.map((db: any) => ({
                id: db.attributes.id,
                name: db.attributes.name,
                username: db.attributes.username,
                host: db.attributes.host?.address,
                port: db.attributes.host?.port,
                connectionsFrom: db.attributes.connections_from,
                maxConnections: db.attributes.max_connections,
            })),
        });
    } catch (error: any) {
        console.error('Error listing databases:', error);
        return NextResponse.json({ error: 'Failed to list databases' }, { status: 500 });
    }
}

/**
 * POST /api/admin/pterodactyl/server/[identifier]/databases
 * Create database
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

        const config = await getGlobalPterodactylConfig();
        if (!config) {
            return NextResponse.json({ error: 'Pterodactyl is not configured' }, { status: 400 });
        }

        const response = await fetch(
            `${config.panelUrl.replace(/\/$/, '')}/api/client/servers/${identifier}/databases`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                },
                body: JSON.stringify({
                    database: body.database,
                    remote: body.remote || '%',
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json({ error: errorData.errors?.[0]?.detail || 'Failed to create database' }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json({
            success: true,
            database: {
                id: data.attributes.id,
                name: data.attributes.name,
                username: data.attributes.username,
                password: data.attributes.relationships?.password?.attributes?.password,
                host: data.attributes.host?.address,
                port: data.attributes.host?.port,
            },
        });
    } catch (error: any) {
        console.error('Error creating database:', error);
        return NextResponse.json({ error: 'Failed to create database' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/pterodactyl/server/[identifier]/databases
 * Delete database
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ identifier: string }> }
) {
    try {
        const { error } = await requirePermission('servers:write');
        if (error) return error;

        const { identifier } = await params;
        const { searchParams } = new URL(request.url);
        const databaseId = searchParams.get('id');

        if (!databaseId) {
            return NextResponse.json({ error: 'Database ID required' }, { status: 400 });
        }

        const config = await getGlobalPterodactylConfig();
        if (!config) {
            return NextResponse.json({ error: 'Pterodactyl is not configured' }, { status: 400 });
        }

        const response = await fetch(
            `${config.panelUrl.replace(/\/$/, '')}/api/client/servers/${identifier}/databases/${databaseId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                },
            }
        );

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to delete database' }, { status: response.status });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting database:', error);
        return NextResponse.json({ error: 'Failed to delete database' }, { status: 500 });
    }
}
