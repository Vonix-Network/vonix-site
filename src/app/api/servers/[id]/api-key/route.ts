import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { servers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

// Generate a secure random API key
function generateSecureApiKey(): string {
    return `vxn_${randomBytes(32).toString('hex')}`;
}

/**
 * POST /api/servers/[id]/api-key
 * Generate or regenerate an API key for a server
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const serverId = parseInt(id, 10);

        if (isNaN(serverId)) {
            return NextResponse.json(
                { error: 'Invalid server ID' },
                { status: 400 }
            );
        }

        // Check if server exists
        const server = await db.query.servers.findFirst({
            where: eq(servers.id, serverId),
        });

        if (!server) {
            return NextResponse.json(
                { error: 'Server not found' },
                { status: 404 }
            );
        }

        // Generate new API key
        const apiKey = generateSecureApiKey();

        // Update server with new API key
        await db
            .update(servers)
            .set({
                apiKey,
                updatedAt: new Date(),
            })
            .where(eq(servers.id, serverId));

        return NextResponse.json({
            success: true,
            apiKey,
            message: 'API key generated successfully',
        });

    } catch (error) {
        console.error('Failed to generate API key:', error);
        return NextResponse.json(
            { error: 'Failed to generate API key' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/servers/[id]/api-key
 * Revoke/delete the API key for a server
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const serverId = parseInt(id, 10);

        if (isNaN(serverId)) {
            return NextResponse.json(
                { error: 'Invalid server ID' },
                { status: 400 }
            );
        }

        // Remove API key
        await db
            .update(servers)
            .set({
                apiKey: null,
                updatedAt: new Date(),
            })
            .where(eq(servers.id, serverId));

        return NextResponse.json({
            success: true,
            message: 'API key revoked',
        });

    } catch (error) {
        console.error('Failed to revoke API key:', error);
        return NextResponse.json(
            { error: 'Failed to revoke API key' },
            { status: 500 }
        );
    }
}
