import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, servers, serverXp, apiKeys } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getLevelForXp } from '@/lib/xp-math';

interface PlayerData {
    uuid: string;
    username: string;
    level: number;
    totalExperience: number;
    currentHealth?: number;
}

interface SyncRequest {
    serverName: string;
    players: PlayerData[];
}

/**
 * POST /api/minecraft/sync/xp
 * Bulk sync player XP from a Minecraft server
 * 
 * This endpoint REPLACES (not adds) the XP for each player on the specified server.
 * Prevents duplication by tracking XP per-server.
 */
export async function POST(request: NextRequest) {
    try {
        // Get API key from Authorization header
        const authHeader = request.headers.get('authorization');
        const apiKey = authHeader?.replace('Bearer ', '');

        if (!apiKey) {
            return NextResponse.json(
                { success: false, error: 'API key required' },
                { status: 401 }
            );
        }

        // Validate API key from apiKeys table
        const validKey = await db.query.apiKeys.findFirst({
            where: eq(apiKeys.key, apiKey),
        });

        if (!validKey) {
            return NextResponse.json(
                { success: false, error: 'Invalid API key' },
                { status: 403 }
            );
        }

        // Parse request body
        const body: SyncRequest = await request.json();
        const { serverName, players } = body;

        // Find server by name
        const server = await db.query.servers.findFirst({
            where: eq(servers.name, serverName),
        });

        if (!server) {
            return NextResponse.json(
                { success: false, error: `Server "${serverName}" not found` },
                { status: 404 }
            );
        }

        if (!players || !Array.isArray(players) || players.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No players to sync' },
                { status: 400 }
            );
        }

        let syncedCount = 0;
        const errors: string[] = [];

        for (const player of players) {
            try {
                // Find user by Minecraft UUID
                const user = await db.query.users.findFirst({
                    where: eq(users.minecraftUuid, player.uuid),
                });

                if (!user) {
                    // Player not registered on website - skip silently
                    continue;
                }

                // Check if server_xp record exists for this user/server
                const existingServerXp = await db.query.serverXp.findFirst({
                    where: and(
                        eq(serverXp.userId, user.id),
                        eq(serverXp.serverId, server.id)
                    ),
                });

                const newXp = player.totalExperience || 0;

                if (existingServerXp) {
                    // UPDATE existing record (replaces, not adds)
                    await db
                        .update(serverXp)
                        .set({
                            amount: newXp,
                            updatedAt: new Date(),
                        })
                        .where(eq(serverXp.id, existingServerXp.id));
                } else {
                    // INSERT new record
                    await db.insert(serverXp).values({
                        userId: user.id,
                        serverId: server.id,
                        amount: newXp,
                    });
                }

                // Recalculate total Minecraft XP from all servers
                const allServerXp = await db.query.serverXp.findMany({
                    where: eq(serverXp.userId, user.id),
                });

                const totalMinecraftXp = allServerXp.reduce((sum, s) => sum + (s.amount || 0), 0);

                // Calculate new total XP and level
                const totalXp = totalMinecraftXp + (user.websiteXp || 0);
                const newTotalLevel = getLevelForXp(totalXp);

                // Update user's minecraftXp and total xp
                await db
                    .update(users)
                    .set({
                        minecraftXp: totalMinecraftXp,
                        xp: totalXp,
                        level: newTotalLevel,
                        updatedAt: new Date(),
                    })
                    .where(eq(users.id, user.id));

                syncedCount++;
            } catch (playerError) {
                console.error(`Error syncing player ${player.uuid}:`, playerError);
                errors.push(player.uuid);
            }
        }

        // Update server's last activity
        await db
            .update(servers)
            .set({ updatedAt: new Date() })
            .where(eq(servers.id, server.id));

        return NextResponse.json({
            success: true,
            syncedCount,
            totalPlayers: players.length,
            errors: errors.length > 0 ? errors : undefined,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('XP sync error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to sync XP' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/minecraft/sync/xp
 * Health check / info endpoint
 */
export async function GET() {
    return NextResponse.json({
        endpoint: '/api/minecraft/sync/xp',
        method: 'POST',
        description: 'Sync player XP from Minecraft servers',
        authentication: 'Bearer token (API key from admin dashboard)',
        payload: {
            serverName: 'string (must match a server name in the database)',
            players: [
                {
                    uuid: 'string (Minecraft UUID)',
                    username: 'string',
                    level: 'number (Minecraft level)',
                    totalExperience: 'number (total Minecraft XP)',
                    currentHealth: 'number (optional)',
                },
            ],
        },
    });
}
