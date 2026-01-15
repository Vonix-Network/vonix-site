import { NextRequest, NextResponse } from 'next/server';
import { pingGameServer, GameType } from '@/lib/game-ping';

// Rate limiting configuration
const RATE_LIMIT = 10; // requests per minute per IP
const RATE_WINDOW = 60 * 1000; // 1 minute

// Rate limiting storage
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Check rate limit for an IP
 */
function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
        rateLimitMap.set(ip, {
            count: 1,
            resetTime: now + RATE_WINDOW
        });
        return { allowed: true, remaining: RATE_LIMIT - 1, resetIn: RATE_WINDOW };
    }

    if (record.count >= RATE_LIMIT) {
        return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
    }

    record.count++;
    return { allowed: true, remaining: RATE_LIMIT - record.count, resetIn: record.resetTime - now };
}

/**
 * Parse server address from query parameter
 * Supports formats: "host:port", "host" (default port based on game type)
 */
function parseServerAddress(server: string, gameType: GameType): { host: string; port: number } {
    const parts = server.split(':');
    const host = parts[0];

    if (parts.length >= 2) {
        const port = parseInt(parts[1], 10);
        if (!isNaN(port) && port > 0 && port <= 65535) {
            return { host, port };
        }
    }

    // Default ports
    const defaultPorts: Record<GameType, number> = {
        minecraft: 25565,
        minecraft_bedrock: 19132,
        hytale: 27015, // Placeholder - unknown actual port
    };

    return { host, port: defaultPorts[gameType] || 25565 };
}

/**
 * GET /api/lookup
 * 
 * Public endpoint for looking up any game server status
 * 
 * Query Parameters:
 * - server: Server address (required) - format: "host:port" or "host"
 * - type: Game type (optional) - "minecraft" (default), "minecraft_bedrock", or "hytale"
 * 
 * Examples:
 * - /api/lookup?server=hypixel.net
 * - /api/lookup?server=play.example.com:25565&type=minecraft
 * - /api/lookup?server=bedrock.example.com&type=minecraft_bedrock
 * 
 * Rate Limited: 10 requests per minute per IP
 */
export async function GET(request: NextRequest) {
    try {
        // Get client IP for rate limiting
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
            request.headers.get('x-real-ip') ||
            'unknown';

        // Check rate limit
        const rateLimit = checkRateLimit(ip);

        // Set rate limit headers
        const rateLimitHeaders = {
            'X-RateLimit-Limit': RATE_LIMIT.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimit.resetIn / 1000).toString(),
        };

        if (!rateLimit.allowed) {
            return NextResponse.json(
                {
                    error: 'Rate limit exceeded. Please try again later.',
                    retryAfter: Math.ceil(rateLimit.resetIn / 1000),
                },
                {
                    status: 429,
                    headers: {
                        ...rateLimitHeaders,
                        'Retry-After': Math.ceil(rateLimit.resetIn / 1000).toString(),
                    },
                }
            );
        }

        // Parse query parameters
        const server = request.nextUrl.searchParams.get('server');
        const typeParam = request.nextUrl.searchParams.get('type') || 'minecraft';

        // Validate server parameter
        if (!server) {
            return NextResponse.json(
                {
                    error: 'Missing required parameter: server',
                    usage: '/api/lookup?server=hostname:port&type=minecraft',
                    supportedTypes: ['minecraft', 'minecraft_bedrock', 'hytale'],
                },
                { status: 400, headers: rateLimitHeaders }
            );
        }

        // Validate and map game type
        const gameTypeMap: Record<string, GameType> = {
            'minecraft': 'minecraft',
            'java': 'minecraft',
            'minecraft_bedrock': 'minecraft_bedrock',
            'bedrock': 'minecraft_bedrock',
            'hytale': 'hytale',
        };

        const gameType = gameTypeMap[typeParam.toLowerCase()];
        if (!gameType) {
            return NextResponse.json(
                {
                    error: `Invalid game type: ${typeParam}`,
                    supportedTypes: ['minecraft', 'minecraft_bedrock', 'hytale'],
                },
                { status: 400, headers: rateLimitHeaders }
            );
        }

        // Parse server address
        const { host, port } = parseServerAddress(server, gameType);

        // Validate host
        if (!host || host.length < 1 || host.length > 255) {
            return NextResponse.json(
                { error: 'Invalid server hostname' },
                { status: 400, headers: rateLimitHeaders }
            );
        }

        console.log(`[lookup] Querying ${host}:${port} (${gameType}) from IP: ${ip}`);

        // Ping the server
        const startTime = Date.now();
        const result = await pingGameServer(host, port, gameType);
        const queryTime = Date.now() - startTime;

        // Build response
        const response = {
            query: {
                server: `${host}:${port}`,
                host,
                port,
                type: gameType,
            },
            online: result.data?.online || false,
            queryTime,
            cachedAt: result.cachedAt?.toISOString() || null,
            ...(result.data?.online && {
                players: {
                    online: result.data.players?.online || 0,
                    max: result.data.players?.max || 0,
                    list: result.data.players?.list?.map(p => ({
                        name: p.name_clean || p.name_raw,
                        uuid: p.uuid,
                    })) || [],
                },
                version: result.data.version?.name_clean || result.data.version?.name_raw || null,
                motd: {
                    raw: result.data.motd?.raw?.join('\n') || null,
                    clean: result.data.motd?.clean?.join('\n') || null,
                },
                icon: result.data.icon || null,
            }),
            ...(!result.data?.online && {
                error: result.error || 'Server is offline or unreachable',
            }),
        };

        return NextResponse.json(response, {
            headers: {
                ...rateLimitHeaders,
                'Cache-Control': 'public, max-age=30', // Cache for 30 seconds
            },
        });

    } catch (error: any) {
        console.error('[lookup] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}
