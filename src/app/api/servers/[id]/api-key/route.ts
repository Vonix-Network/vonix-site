import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { servers, apiKeys } from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';
import { randomBytes } from 'crypto';

// Generate a secure random API key
function generateSecureApiKey(): string {
    return `vxn_${randomBytes(32).toString('hex')}`;
}

/**
 * POST /api/servers/[id]/api-key
 * Generate or regenerate an API key for a server
 * 
 * API keys are stored in the apiKeys table with a naming convention:
 * server_<serverId>_key
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
        const keyName = `server_${serverId}_key`;

        // Check if an API key already exists for this server
        const existingKey = await db.query.apiKeys.findFirst({
            where: eq(apiKeys.name, keyName),
        });

        if (existingKey) {
            // Update existing key
            await db
                .update(apiKeys)
                .set({
                    key: apiKey,
                    updatedAt: new Date(),
                })
                .where(eq(apiKeys.name, keyName));
        } else {
            // Create new key entry
            await db.insert(apiKeys).values({
                name: keyName,
                key: apiKey,
            });
        }

        return NextResponse.json({
            success: true,
            apiKey,
            message: 'API key generated successfully',
        });

    } catch (error: any) {
        console.error('Failed to generate API key:', error);
        return NextResponse.json(
            { error: 'Failed to generate API key' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/servers/[id]/api-key
 * Get the current API key for a server (masked)
 */
export async function GET(
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

        const keyName = `server_${serverId}_key`;
        const keyEntry = await db.query.apiKeys.findFirst({
            where: eq(apiKeys.name, keyName),
        });

        if (!keyEntry) {
            return NextResponse.json({
                hasKey: false,
                maskedKey: null,
            });
        }

        // Return masked key (show first 4 and last 4 characters)
        const fullKey = keyEntry.key;
        const maskedKey = fullKey.length > 12
            ? `${fullKey.substring(0, 8)}...${fullKey.substring(fullKey.length - 4)}`
            : '****';

        return NextResponse.json({
            hasKey: true,
            maskedKey,
        });

    } catch (error: any) {
        console.error('Failed to get API key:', error);
        return NextResponse.json(
            { error: 'Failed to get API key' },
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

        const keyName = `server_${serverId}_key`;

        // Remove API key entry
        await db
            .delete(apiKeys)
            .where(eq(apiKeys.name, keyName));

        return NextResponse.json({
            success: true,
            message: 'API key revoked',
        });

    } catch (error: any) {
        console.error('Failed to revoke API key:', error);
        return NextResponse.json(
            { error: 'Failed to revoke API key' },
            { status: 500 }
        );
    }
}
