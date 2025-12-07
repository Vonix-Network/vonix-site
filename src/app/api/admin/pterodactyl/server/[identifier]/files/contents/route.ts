import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-guard';
import { getGlobalPterodactylConfig } from '@/lib/pterodactyl';

/**
 * GET /api/admin/pterodactyl/server/[identifier]/files/contents
 * Get file contents
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
        const file = searchParams.get('file');

        if (!file) {
            return NextResponse.json({ error: 'File path required' }, { status: 400 });
        }

        const config = await getGlobalPterodactylConfig();
        if (!config) {
            return NextResponse.json({ error: 'Pterodactyl is not configured' }, { status: 400 });
        }

        const response = await fetch(
            `${config.panelUrl.replace(/\/$/, '')}/api/client/servers/${identifier}/files/contents?file=${encodeURIComponent(file)}`,
            {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                },
            }
        );

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to read file' }, { status: response.status });
        }

        const content = await response.text();
        return NextResponse.json({ success: true, content });
    } catch (error) {
        console.error('Error reading file:', error);
        return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
    }
}

/**
 * POST /api/admin/pterodactyl/server/[identifier]/files/contents
 * Write file contents
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ identifier: string }> }
) {
    try {
        const { error } = await requirePermission('servers:write');
        if (error) return error;

        const { identifier } = await params;
        const { searchParams } = new URL(request.url);
        const file = searchParams.get('file');
        const body = await request.json();

        if (!file) {
            return NextResponse.json({ error: 'File path required' }, { status: 400 });
        }

        const config = await getGlobalPterodactylConfig();
        if (!config) {
            return NextResponse.json({ error: 'Pterodactyl is not configured' }, { status: 400 });
        }

        const response = await fetch(
            `${config.panelUrl.replace(/\/$/, '')}/api/client/servers/${identifier}/files/write?file=${encodeURIComponent(file)}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain',
                    'Authorization': `Bearer ${config.apiKey}`,
                },
                body: body.content,
            }
        );

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to write file' }, { status: response.status });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error writing file:', error);
        return NextResponse.json({ error: 'Failed to write file' }, { status: 500 });
    }
}
