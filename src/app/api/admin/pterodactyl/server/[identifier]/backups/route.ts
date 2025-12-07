import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-guard';
import { getGlobalPterodactylConfig } from '@/lib/pterodactyl';

/**
 * GET /api/admin/pterodactyl/server/[identifier]/backups
 * List backups
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
            `${config.panelUrl.replace(/\/$/, '')}/api/client/servers/${identifier}/backups`,
            {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                },
            }
        );

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to list backups' }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json({
            success: true,
            backups: data.data.map((b: any) => ({
                uuid: b.attributes.uuid,
                name: b.attributes.name,
                ignoredFiles: b.attributes.ignored_files,
                sha256Hash: b.attributes.sha256_hash,
                bytes: b.attributes.bytes,
                isSuccessful: b.attributes.is_successful,
                isLocked: b.attributes.is_locked,
                createdAt: b.attributes.created_at,
                completedAt: b.attributes.completed_at,
            })),
        });
    } catch (error) {
        console.error('Error listing backups:', error);
        return NextResponse.json({ error: 'Failed to list backups' }, { status: 500 });
    }
}

/**
 * POST /api/admin/pterodactyl/server/[identifier]/backups
 * Create backup
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
            `${config.panelUrl.replace(/\/$/, '')}/api/client/servers/${identifier}/backups`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                },
                body: JSON.stringify({
                    name: body.name || '',
                    ignored: body.ignored || '',
                    is_locked: body.isLocked || false,
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json({ error: errorData.errors?.[0]?.detail || 'Failed to create backup' }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json({
            success: true,
            backup: {
                uuid: data.attributes.uuid,
                name: data.attributes.name,
                createdAt: data.attributes.created_at,
            },
        });
    } catch (error) {
        console.error('Error creating backup:', error);
        return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/pterodactyl/server/[identifier]/backups
 * Delete backup
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
        const backupId = searchParams.get('uuid');

        if (!backupId) {
            return NextResponse.json({ error: 'Backup UUID required' }, { status: 400 });
        }

        const config = await getGlobalPterodactylConfig();
        if (!config) {
            return NextResponse.json({ error: 'Pterodactyl is not configured' }, { status: 400 });
        }

        const response = await fetch(
            `${config.panelUrl.replace(/\/$/, '')}/api/client/servers/${identifier}/backups/${backupId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                },
            }
        );

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to delete backup' }, { status: response.status });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting backup:', error);
        return NextResponse.json({ error: 'Failed to delete backup' }, { status: 500 });
    }
}
