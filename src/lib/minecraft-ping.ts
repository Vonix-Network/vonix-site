/**
 * Native Minecraft Server Pinger
 * 
 * Implements the Minecraft Server List Ping protocol directly using TCP sockets.
 * This provides more reliable and faster status checks compared to external APIs.
 * 
 * Protocol documentation: https://wiki.vg/Server_List_Ping
 */

import { MinecraftServerStatus, ServerStatusResult } from './minecraft-status';

// In-memory cache with timestamps
interface CacheEntry {
  data: MinecraftServerStatus;
  timestamp: number;
  source: 'native' | 'api';
}

const pingCache = new Map<string, CacheEntry>();
const CACHE_TTL = 30_000; // 30 seconds for native ping cache (shorter than API cache)
const PING_TIMEOUT = 5_000; // 5 second timeout for direct ping

/**
 * Parse a VarInt from a buffer at the given offset
 * Returns [value, bytesRead]
 */
function readVarInt(buffer: Buffer, offset: number): [number, number] {
  let value = 0;
  let position = 0;
  let bytesRead = 0;

  while (true) {
    if (offset + bytesRead >= buffer.length) {
      throw new Error('VarInt extends beyond buffer');
    }
    
    const byte = buffer[offset + bytesRead];
    value |= (byte & 0x7F) << position;
    bytesRead++;
    
    if ((byte & 0x80) === 0) break;
    position += 7;
    
    if (position >= 32) {
      throw new Error('VarInt is too big');
    }
  }

  return [value, bytesRead];
}

/**
 * Write a VarInt to a buffer
 */
function writeVarInt(value: number): Buffer {
  const bytes: number[] = [];
  
  while (true) {
    if ((value & ~0x7F) === 0) {
      bytes.push(value);
      break;
    }
    bytes.push((value & 0x7F) | 0x80);
    value >>>= 7;
  }
  
  return Buffer.from(bytes);
}

/**
 * Create a handshake packet for Minecraft server list ping
 */
function createHandshakePacket(host: string, port: number): Buffer {
  const protocolVersion = writeVarInt(-1); // -1 for ping
  const hostBytes = Buffer.from(host, 'utf8');
  const hostLength = writeVarInt(hostBytes.length);
  const portBuffer = Buffer.alloc(2);
  portBuffer.writeUInt16BE(port);
  const nextState = writeVarInt(1); // 1 = status

  const payload = Buffer.concat([
    protocolVersion,
    hostLength,
    hostBytes,
    portBuffer,
    nextState,
  ]);

  const packetId = writeVarInt(0x00); // Handshake packet ID
  const packetData = Buffer.concat([packetId, payload]);
  const packetLength = writeVarInt(packetData.length);

  return Buffer.concat([packetLength, packetData]);
}

/**
 * Create a status request packet
 */
function createStatusRequestPacket(): Buffer {
  const packetId = writeVarInt(0x00);
  const packetLength = writeVarInt(packetId.length);
  return Buffer.concat([packetLength, packetId]);
}

/**
 * Parse the JSON response from the server
 */
function parseServerResponse(jsonStr: string): MinecraftServerStatus {
  try {
    const data = JSON.parse(jsonStr);
    
    // Parse players
    const players: MinecraftServerStatus['players'] = {
      online: data.players?.online ?? 0,
      max: data.players?.max ?? 0,
      list: (data.players?.sample || []).map((p: any) => ({
        uuid: p.id || p.uuid || '',
        name_raw: p.name || 'Unknown',
        name_clean: p.name || 'Unknown',
      })),
    };

    // Parse version
    let version: MinecraftServerStatus['version'] = undefined;
    if (data.version) {
      version = {
        name_raw: data.version.name || '',
        name_clean: (data.version.name || '').replace(/§[0-9a-fk-or]/gi, ''),
      };
    }

    // Parse MOTD
    let motd: MinecraftServerStatus['motd'] = undefined;
    if (data.description) {
      if (typeof data.description === 'string') {
        motd = {
          raw: [data.description],
          clean: [data.description.replace(/§[0-9a-fk-or]/gi, '')],
        };
      } else if (data.description.text) {
        motd = {
          raw: [data.description.text],
          clean: [data.description.text.replace(/§[0-9a-fk-or]/gi, '')],
        };
      } else if (data.description.extra) {
        const text = data.description.extra.map((e: any) => e.text || '').join('');
        motd = {
          raw: [text],
          clean: [text.replace(/§[0-9a-fk-or]/gi, '')],
        };
      }
    }

    return {
      online: true,
      players,
      version,
      motd,
      icon: data.favicon || null,
    };
  } catch (error) {
    console.error('[minecraft-ping] Failed to parse server response:', error);
    return { online: true };
  }
}

/**
 * Ping a Minecraft server using the native protocol
 * This function uses dynamic import for Node.js 'net' module to work in Next.js
 */
export async function pingServerNative(
  host: string,
  port: number = 25565
): Promise<ServerStatusResult> {
  const cacheKey = `${host}:${port}`;
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

  return new Promise((resolve) => {
    // Dynamic import of net module (only works server-side)
    import('net').then(({ Socket }) => {
      const socket = new Socket();
      let responseData = Buffer.alloc(0);
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          console.log(`[minecraft-ping] Timeout pinging ${host}:${port}`);
          resolve({
            success: false,
            data: { online: false },
            error: 'Connection timeout',
          });
        }
      }, PING_TIMEOUT);

      socket.on('connect', () => {
        // Send handshake
        socket.write(createHandshakePacket(host, port));
        // Send status request
        socket.write(createStatusRequestPacket());
      });

      socket.on('data', (data) => {
        responseData = Buffer.concat([responseData, data]);

        try {
          // Try to parse the response
          let offset = 0;
          const [packetLength, lengthBytes] = readVarInt(responseData, offset);
          offset += lengthBytes;

          if (responseData.length >= offset + packetLength) {
            const [packetId, idBytes] = readVarInt(responseData, offset);
            offset += idBytes;

            if (packetId === 0x00) {
              const [jsonLength, jsonLengthBytes] = readVarInt(responseData, offset);
              offset += jsonLengthBytes;

              const jsonStr = responseData.toString('utf8', offset, offset + jsonLength);
              const status = parseServerResponse(jsonStr);

              // Cache the result
              pingCache.set(cacheKey, {
                data: status,
                timestamp: now,
                source: 'native',
              });

              clearTimeout(timeout);
              resolved = true;
              socket.destroy();

              console.log(`[minecraft-ping] Successfully pinged ${host}:${port} - ${status.players?.online || 0} players online`);

              resolve({
                success: true,
                data: status,
                cachedAt: new Date(now),
              });
            }
          }
        } catch (error) {
          // Not enough data yet, wait for more
        }
      });

      socket.on('error', (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          console.log(`[minecraft-ping] Error pinging ${host}:${port}:`, error.message);
          resolve({
            success: false,
            data: { online: false },
            error: error.message,
          });
        }
      });

      socket.on('close', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve({
            success: false,
            data: { online: false },
            error: 'Connection closed unexpectedly',
          });
        }
      });

      socket.connect(port, host);
    }).catch((error) => {
      console.error('[minecraft-ping] Failed to import net module:', error);
      resolve({
        success: false,
        data: { online: false },
        error: 'Native ping not available',
      });
    });
  });
}

/**
 * Clear the native ping cache
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

