import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-guard';
import { getGlobalPterodactylConfig } from '@/lib/pterodactyl';

/**
 * GET /api/admin/pterodactyl/server/[identifier]/files
 * List files in a directory
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ identifier: string }> }
) {
    try {
        const { error } = await requirePermission('servers:read');
        if (error) return error;

        const { identifier } = await params;
        const { searchParams } = new URL(request.url);
        const directory = searchParams.get('directory') || '/';

        const config = await getGlobalPterodactylConfig();
        if (!config) {
            return NextResponse.json({ error: 'Pterodactyl is not configured' }, { status: 400 });
        }

        const response = await fetch(
            `${config.panelUrl.replace(/\/$/, '')}/api/client/servers/${identifier}/files/list?directory=${encodeURIComponent(directory)}`,
            {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Pterodactyl files error:', errorText);
            return NextResponse.json({ error: 'Failed to list files' }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json({
            success: true,
            files: data.data.map((f: any) => ({
                name: f.attributes.name,
                mode: f.attributes.mode,
                size: f.attributes.size,
                isFile: f.attributes.is_file,
                isSymlink: f.attributes.is_symlink,
                mimetype: f.attributes.mimetype,
                createdAt: f.attributes.created_at,
                modifiedAt: f.attributes.modified_at,
            })),
        });
    } catch (error: any) {
        console.error('Error listing files:', error);
        return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
    }
}

/**
 * POST /api/admin/pterodactyl/server/[identifier]/files
 * File operations: rename, copy, delete, compress, decompress, create folder
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
        const { action, ...actionParams } = body;

        const config = await getGlobalPterodactylConfig();
        if (!config) {
            return NextResponse.json({ error: 'Pterodactyl is not configured' }, { status: 400 });
        }

        let endpoint = '';
        let requestBody: any = {};

        switch (action) {
            case 'rename':
                endpoint = `/api/client/servers/${identifier}/files/rename`;
                requestBody = { root: actionParams.root || '/', files: [{ from: actionParams.from, to: actionParams.to }] };
                break;
            case 'copy':
                endpoint = `/api/client/servers/${identifier}/files/copy`;
                requestBody = { location: actionParams.location };
                break;
            case 'delete':
                endpoint = `/api/client/servers/${identifier}/files/delete`;
                requestBody = { root: actionParams.root || '/', files: actionParams.files };
                break;
            case 'compress':
                endpoint = `/api/client/servers/${identifier}/files/compress`;
                requestBody = { root: actionParams.root || '/', files: actionParams.files };
                break;
            case 'decompress':
                endpoint = `/api/client/servers/${identifier}/files/decompress`;
                requestBody = { root: actionParams.root || '/', file: actionParams.file };
                break;
            case 'create-folder':
                endpoint = `/api/client/servers/${identifier}/files/create-folder`;
                requestBody = { root: actionParams.root || '/', name: actionParams.name };
                break;
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        const response = await fetch(`${config.panelUrl.replace(/\/$/, '')}${endpoint}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Pterodactyl file action error:', errorText);
            return NextResponse.json({ error: `Failed to ${action}` }, { status: response.status });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error performing file action:', error);
        return NextResponse.json({ error: 'Failed to perform file action' }, { status: 500 });
    }
}
