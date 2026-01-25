import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, servers, serverXp, apiKeys, minecraftPlayers } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getLevelForXp } from '@/lib/xp-math';

interface PlayerData {
    uuid: string;
    username: string;
    level: number;
    totalExperience: number;
    currentHealth?: number;
    playtimeSeconds?: number;
}

interface SyncRequest {
    serverName: string;
    players: PlayerData[];
}

/**
 * POST /api/minecraft/sync/xp
 * Bulk sync player XP from a Minecraft server
 * 
 * This endpoint syncs XP for ALL players:
 * - Registered users: XP stored in serverXp table and aggregated to user's total
 * - Unregistered players: XP stored in minecraftPlayers table for leaderboard display
 */
export async function POST(request: NextRequest) {
    try {
        // Get API key from either x-api-key header or Authorization header
        const apiKey = request.headers.get('x-api-key') ||
            request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();

        console.log('[XP Sync] API key present:', !!apiKey);

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
            console.log('[XP Sync] API key not found in database');
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

        console.log(`[XP Sync] Found server: ${server.name} (ID: ${server.id})`);

        if (!players || !Array.isArray(players) || players.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No players to sync' },
                { status: 400 }
            );
        }

        let syncedCount = 0;
        let registeredCount = 0;
        let unregisteredCount = 0;
        const errors: string[] = [];

        for (const player of players) {
            try {
                // Normalize UUID (remove dashes if present, then format consistently)
                const normalizedUuid = player.uuid.toLowerCase().replace(/-/g, '');
                const formattedUuid = `${normalizedUuid.slice(0, 8)}-${normalizedUuid.slice(8, 12)}-${normalizedUuid.slice(12, 16)}-${normalizedUuid.slice(16, 20)}-${normalizedUuid.slice(20)}`;

                // Find user by Minecraft UUID (try both formats)
                let user = await db.query.users.findFirst({
                    where: sql`LOWER(REPLACE(${users.minecraftUuid}, '-', '')) = ${normalizedUuid}`,
                });

                // Fallback: Try to find by Minecraft username (case-insensitive)
                if (!user && player.username) {
                    user = await db.query.users.findFirst({
                        where: sql`LOWER(${users.minecraftUsername}) = LOWER(${player.username})`,
                    });
                    
                    if (user) {
                        console.log(`[XP Sync] Found user by username fallback: ${player.username}`);
                        
                        // If user exists but has no UUID, update it now
                        if (!user.minecraftUuid) {
                            console.log(`[XP Sync] Updating missing UUID for user ${user.username} to ${formattedUuid}`);
                            await db.update(users)
                                .set({ minecraftUuid: formattedUuid })
                                .where(eq(users.id, user.id));
                        }
                    }
                }

                const newXp = player.totalExperience || 0;
                const newPlaytime = player.playtimeSeconds || 0;

                if (user) {
                    // ========== REGISTERED USER ==========
                    registeredCount++;
                    console.log(`[XP Sync] Syncing registered player: ${player.username} (${formattedUuid})`);

                    // Check if server_xp record exists for this user/server
                    const existingServerXp = await db.query.serverXp.findFirst({
                        where: and(
                            eq(serverXp.userId, user.id),
                            eq(serverXp.serverId, server.id)
                        ),
                    });

                    if (existingServerXp) {
                        // HIGH-WATER MARK: Only update if new value is higher
                        const currentXp = Number(existingServerXp.xp || 0);
                        const xpToStore = Math.max(currentXp, newXp);
                        const currentPlaytime = Number(existingServerXp.playtimeSeconds || 0);

                        await db
                            .update(serverXp)
                            .set({
                                xp: xpToStore,
                                level: newXp > currentXp ? (player.level || 0) : existingServerXp.level,
                                playtimeSeconds: Math.max(currentPlaytime, newPlaytime),
                                lastSyncedAt: new Date(),
                            })
                            .where(eq(serverXp.id, existingServerXp.id));
                    } else {
                        // INSERT new record
                        await db.insert(serverXp).values({
                            userId: user.id,
                            serverId: server.id,
                            xp: newXp,
                            level: player.level || 0,
                            playtimeSeconds: newPlaytime,
                        });
                    }

                    // Recalculate total Minecraft XP from all servers
                    const allServerXp = await db.query.serverXp.findMany({
                        where: eq(serverXp.userId, user.id),
                    });

                    const totalMinecraftXp = allServerXp.reduce((sum: number, s: any) => sum + Number(s.xp || 0), 0);
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

                    // Also update/link the minecraftPlayers record if it exists
                    await db
                        .update(minecraftPlayers)
                        .set({ linkedUserId: user.id })
                        .where(sql`LOWER(REPLACE(${minecraftPlayers.uuid}, '-', '')) = ${normalizedUuid}`);

                } else {
                    // ========== UNREGISTERED PLAYER ==========
                    unregisteredCount++;
                    console.log(`[XP Sync] Syncing unregistered player: ${player.username} (${formattedUuid})`);

                    // Check if minecraft_players record exists
                    const existingPlayer = await db.query.minecraftPlayers.findFirst({
                        where: sql`LOWER(REPLACE(${minecraftPlayers.uuid}, '-', '')) = ${normalizedUuid}`,
                    });

                    if (existingPlayer) {
                        // HIGH-WATER MARK: Only update if new value is higher
                        const currentXp = Number(existingPlayer.xp || 0);
                        const xpToStore = Math.max(currentXp, newXp);
                        const currentPlaytime = Number(existingPlayer.playtimeSeconds || 0);

                        await db
                            .update(minecraftPlayers)
                            .set({
                                username: player.username, // Update username in case it changed
                                xp: xpToStore,
                                level: newXp > currentXp ? (player.level || 0) : existingPlayer.level,
                                playtimeSeconds: Math.max(currentPlaytime, newPlaytime),
                                lastSyncedAt: new Date(),
                            })
                            .where(eq(minecraftPlayers.id, existingPlayer.id));
                    } else {
                        // INSERT new unregistered player
                        await db.insert(minecraftPlayers).values({
                            uuid: formattedUuid,
                            username: player.username,
                            xp: newXp,
                            level: player.level || 0,
                            playtimeSeconds: newPlaytime,
                        });
                    }
                }

                syncedCount++;
            } catch (playerError: any) {
                console.error(`Error syncing player ${player.uuid}:`, playerError);
                errors.push(player.uuid);
            }
        }

        // Update server's last activity
        await db
            .update(servers)
            .set({ updatedAt: new Date() })
            .where(eq(servers.id, server.id));

        console.log(`[XP Sync] Completed: ${syncedCount} total (${registeredCount} registered, ${unregisteredCount} unregistered)`);

        return NextResponse.json({
            success: true,
            syncedCount,
            registeredCount,
            unregisteredCount,
            totalPlayers: players.length,
            errors,
        });
    } catch (error: any) {
        console.error('[XP Sync] Global error:', error);
        return NextResponse.json(
            { success: false, error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
