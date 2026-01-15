/**
 * Unified Game Server Pinger
 * 
 * Supports multiple game types with native protocol implementations.
 * Currently supports:
 * - Minecraft Java Edition (native TCP ping)
 * - Minecraft Bedrock Edition (native UDP query)
 * - Hytale (placeholder - protocol TBD when game releases)
 * 
 * Features:
 * - 3 ping attempts with increasing timeouts (2s, 3s, 5s)
 * - In-memory caching with 30s TTL
 * - No external API dependencies
 */

import { pingServerNative } from './minecraft-ping';
import { MinecraftServerStatus, ServerStatusResult } from './minecraft-status';

// Game types supported
export type GameType = 'minecraft' | 'minecraft_bedrock' | 'hytale';

// Ping configuration
const PING_ATTEMPTS = 3;
const PING_TIMEOUTS = [2000, 3000, 5000]; // Increasing timeouts for each attempt
const CACHE_TTL = 30_000; // 30 seconds

// Cache for ping results
interface CacheEntry {
    data: MinecraftServerStatus;
    timestamp: number;
    gameType: GameType;
}

const pingCache = new Map<string, CacheEntry>();

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Ping a Minecraft Bedrock server using UDP query
 * Note: Bedrock uses UDP, not TCP like Java Edition
 */
async function pingBedrockServer(host: string, port: number = 19132): Promise<ServerStatusResult> {
    return new Promise((resolve) => {
        import('dgram').then((dgram) => {
            const socket = dgram.createSocket('udp4');
            let resolved = false;

            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    socket.close();
                    resolve({
                        success: false,
                        data: { online: false },
                        error: 'Connection timeout',
                    });
                }
            }, 5000);

            // Bedrock unconnected ping packet
            const MAGIC = Buffer.from([
                0x00, 0xff, 0xff, 0x00, 0xfe, 0xfe, 0xfe, 0xfe,
                0xfd, 0xfd, 0xfd, 0xfd, 0x12, 0x34, 0x56, 0x78
            ]);

            const packet = Buffer.alloc(33);
            packet.writeUInt8(0x01, 0); // Unconnected Ping
            packet.writeBigInt64BE(BigInt(Date.now()), 1); // Timestamp
            MAGIC.copy(packet, 9);
            packet.writeBigInt64BE(BigInt(2), 25); // Client GUID

            socket.on('message', (msg) => {
                if (!resolved && msg[0] === 0x1c) { // Unconnected Pong
                    resolved = true;
                    clearTimeout(timeout);
                    socket.close();

                    try {
                        // Parse response - format: ID;Edition;MOTD;Protocol;Version;Players;Max;GUID;Level;Gamemode;Port;Port
                        const dataOffset = 35; // Skip header
                        const dataLength = msg.readUInt16BE(dataOffset);
                        const data = msg.toString('utf8', dataOffset + 2, dataOffset + 2 + dataLength);
                        const parts = data.split(';');

                        resolve({
                            success: true,
                            data: {
                                online: true,
                                version: {
                                    name_raw: parts[3] || 'Unknown',
                                    name_clean: parts[3] || 'Unknown',
                                },
                                players: {
                                    online: parseInt(parts[4]) || 0,
                                    max: parseInt(parts[5]) || 0,
                                },
                                motd: {
                                    raw: [parts[1] || ''],
                                    clean: [parts[1] || ''],
                                },
                            },
                        });
                    } catch (error) {
                        resolve({
                            success: true,
                            data: { online: true },
                        });
                    }
                }
            });

            socket.on('error', (error) => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    socket.close();
                    resolve({
                        success: false,
                        data: { online: false },
                        error: error.message,
                    });
                }
            });

            socket.send(packet, port, host);
        }).catch((error) => {
            resolve({
                success: false,
                data: { online: false },
                error: 'UDP not available',
            });
        });
    });
}

/**
 * Placeholder for Hytale server ping
 * Will be implemented when Hytale is released and protocol is documented
 */
async function pingHytaleServer(host: string, port: number): Promise<ServerStatusResult> {
    // Hytale is not yet released - return a placeholder response
    return {
        success: true,
        data: {
            online: false,
            version: {
                name_raw: 'Hytale (Coming Soon)',
                name_clean: 'Hytale (Coming Soon)',
            },
            motd: {
                raw: ['Hytale server support coming soon'],
                clean: ['Hytale server support coming soon'],
            },
        },
        error: 'Hytale protocol not yet implemented',
    };
}

/**
 * Ping a game server with retry logic
 * 
 * @param host Server hostname or IP
 * @param port Server port
 * @param gameType Type of game server
 * @returns ServerStatusResult with online status and details
 */
export async function pingGameServer(
    host: string,
    port: number,
    gameType: GameType = 'minecraft'
): Promise<ServerStatusResult> {
    const cacheKey = `${gameType}:${host}:${port}`;
    const now = Date.now();

    // Check cache first
    const cached = pingCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL) {
        return {
            success: true,
            data: cached.data,
            cachedAt: new Date(cached.timestamp),
        };
    }

    let lastError: string | undefined;
    let bestResult: MinecraftServerStatus | null = null;

    // Try multiple ping attempts with increasing timeouts
    for (let attempt = 0; attempt < PING_ATTEMPTS; attempt++) {
        const timeout = PING_TIMEOUTS[attempt] || 5000;

        if (attempt > 0) {
            // Wait a bit before retry
            await sleep(1000);
            console.log(`[game-ping] Retry ${attempt + 1}/${PING_ATTEMPTS} for ${host}:${port} (${gameType})`);
        }

        try {
            let result: ServerStatusResult;

            switch (gameType) {
                case 'minecraft':
                    result = await Promise.race([
                        pingServerNative(host, port),
                        new Promise<ServerStatusResult>((resolve) =>
                            setTimeout(() => resolve({
                                success: false,
                                data: { online: false },
                                error: 'Timeout',
                            }), timeout)
                        ),
                    ]);
                    break;

                case 'minecraft_bedrock':
                    result = await Promise.race([
                        pingBedrockServer(host, port),
                        new Promise<ServerStatusResult>((resolve) =>
                            setTimeout(() => resolve({
                                success: false,
                                data: { online: false },
                                error: 'Timeout',
                            }), timeout)
                        ),
                    ]);
                    break;

                case 'hytale':
                    result = await pingHytaleServer(host, port);
                    break;

                default:
                    result = await pingServerNative(host, port);
            }

            if (result.success && result.data?.online) {
                // Success! Cache and return
                pingCache.set(cacheKey, {
                    data: result.data,
                    timestamp: now,
                    gameType,
                });

                console.log(`[game-ping] ✓ ${host}:${port} (${gameType}) - ONLINE, ${result.data.players?.online || 0} players`);
                return result;
            }

            // Keep track of best result (might have partial data)
            if (result.success && result.data) {
                bestResult = result.data;
            }
            lastError = result.error;

        } catch (error: any) {
            lastError = error.message || 'Unknown error';
            console.log(`[game-ping] Attempt ${attempt + 1} failed for ${host}:${port}: ${lastError}`);
        }
    }

    // All attempts failed
    console.log(`[game-ping] ✗ ${host}:${port} (${gameType}) - OFFLINE after ${PING_ATTEMPTS} attempts`);

    // Return best available data or offline status
    return {
        success: false,
        data: bestResult || { online: false },
        error: lastError || 'All ping attempts failed',
    };
}

/**
 * Ping multiple servers concurrently with rate limiting
 */
export async function pingMultipleServers(
    servers: Array<{ host: string; port: number; gameType?: GameType }>
): Promise<Map<string, ServerStatusResult>> {
    const results = new Map<string, ServerStatusResult>();
    const BATCH_SIZE = 5; // Process 5 servers at a time

    for (let i = 0; i < servers.length; i += BATCH_SIZE) {
        const batch = servers.slice(i, i + BATCH_SIZE);

        await Promise.all(
            batch.map(async (server) => {
                const key = `${server.host}:${server.port}`;
                const result = await pingGameServer(
                    server.host,
                    server.port,
                    server.gameType || 'minecraft'
                );
                results.set(key, result);
            })
        );
    }

    return results;
}

/**
 * Clear the ping cache
 */
export function clearPingCache(): void {
    pingCache.clear();
}

/**
 * Get cache statistics
 */
export function getPingCacheStats(): { entries: number; keys: string[] } {
    return {
        entries: pingCache.size,
        keys: Array.from(pingCache.keys()),
    };
}
