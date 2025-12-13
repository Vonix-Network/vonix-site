/**
 * Minecraft Server Status Integration
 * Uses mcstatus.io v2 Java API for real-time server status
 *
 * Docs: https://mcstatus.io/docs
 * Endpoint: https://api.mcstatus.io/v2/status/java/{address}
 */

// Shape based on mcstatus.io v2 Java status
export interface MinecraftServerStatus {
  online: boolean;
  host?: string;
  port?: number;
  ip_address?: string;
  eula_blocked?: boolean;
  retrieved_at?: string;
  expires_at?: string;
  version?: {
    name_raw?: string;
    name_clean?: string;
    name_html?: string;
  };
  players?: {
    online?: number;
    max?: number;
    list?: Array<{
      name_raw?: string;
      name_clean?: string;
      name_html?: string;
      uuid?: string;
    }>;
  };
  motd?: {
    raw?: string[];
    clean?: string[];
    html?: string[];
  };
  icon?: string | null;
}

export interface ServerStatusResult {
  success: boolean;
  data: MinecraftServerStatus | null;
  error?: string;
  cachedAt?: Date;
}

// Cache for server status to avoid excessive API calls
const statusCache = new Map<string, { data: MinecraftServerStatus; timestamp: number }>();
const CACHE_DURATION = 60 * 1000; // 1 minute cache
const REQUEST_TIMEOUT = 15000; // 15 second timeout (increased for slow mcstatus.io)
const MAX_RETRIES = 3; // 3 retries for better reliability
const INITIAL_RETRY_DELAY = 2000; // 2 second initial delay before first retry

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout: number = REQUEST_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Sleep for retry delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch server status from mcstatus.io (Java) with retry logic
 */
export async function getServerStatus(
  address: string,
  port: number = 25565,
  isBedrockServer: boolean = false
): Promise<ServerStatusResult> {
  const cacheKey = `${address}:${port}:${isBedrockServer}`;
  const now = Date.now();

  // Check cache first
  const cached = statusCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return {
      success: true,
      data: cached.data,
      cachedAt: new Date(cached.timestamp),
    };
  }

  // For Bedrock servers, use the bedrock endpoint
  const endpoint = isBedrockServer ? 'bedrock' : 'java';
  const target = port === 25565 || (isBedrockServer && port === 19132)
    ? encodeURIComponent(address)
    : encodeURIComponent(`${address}:${port}`);

  const url = `https://api.mcstatus.io/v2/status/${endpoint}/${target}`;

  let lastError: Error | null = null;

  // Retry logic with configurable delay
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        // First retry waits INITIAL_RETRY_DELAY, then exponential backoff
        const delay = attempt === 1 ? INITIAL_RETRY_DELAY : INITIAL_RETRY_DELAY * attempt;
        await sleep(delay);
        console.log(`[mcstatus.io] Retry ${attempt}/${MAX_RETRIES} for ${address}:${port} (waited ${delay}ms)`);
      }

      const response = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': 'VonixNetwork/1.0',
          'Accept': 'application/json',
        },
        cache: 'no-store', // Don't use browser cache, we have our own
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data: MinecraftServerStatus = await response.json();

      // Debug logging for server status
      const versionName = data.version?.name_clean || data.version?.name_raw || 'N/A';
      const onlinePlayers = data.players?.online ?? 0;
      const maxPlayers = data.players?.max ?? 0;
      console.log(`[mcstatus.io] ${address}:${port} => online: ${data.online}, players: ${onlinePlayers}/${maxPlayers}, version: ${versionName}`);

      // Update cache
      statusCache.set(cacheKey, { data, timestamp: now });

      return {
        success: true,
        data,
        cachedAt: new Date(now),
      };
    } catch (error: any) {
      lastError = error;

      // Log timeout but continue retrying (mcstatus.io can be slow)
      if (error.name === 'AbortError') {
        console.warn(`[mcstatus.io] Timeout on attempt ${attempt + 1}/${MAX_RETRIES + 1} for ${address}:${port}`);
        // Continue to next retry instead of breaking
      }
    }
  }

  console.error(`Failed to fetch server status for ${address}:${port} from mcstatus.io:`, lastError?.message ?? lastError);

  // Return cached data if available (even if stale), otherwise return offline
  const staleCache = statusCache.get(cacheKey);
  if (staleCache) {
    console.log(`[mcstatus.io] Returning stale cache for ${address}:${port}`);
    return {
      success: true,
      data: { ...staleCache.data, online: false }, // Mark as offline but return last known data
      cachedAt: new Date(staleCache.timestamp),
      error: 'Using stale data',
    };
  }

  return {
    success: false,
    data: { online: false },
    error: lastError?.message || 'Failed to fetch status',
  };
}

/**
 * Fetch status for multiple servers with concurrency limit
 */
export async function getMultipleServerStatus(
  servers: Array<{ address: string; port: number; isBedrock?: boolean }>
): Promise<Map<string, ServerStatusResult>> {
  const results = new Map<string, ServerStatusResult>();

  // Process in batches of 5 to avoid overwhelming the API
  const batchSize = 5;
  for (let i = 0; i < servers.length; i += batchSize) {
    const batch = servers.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (server) => {
        const key = `${server.address}:${server.port}`;
        const result = await getServerStatus(server.address, server.port, server.isBedrock);
        results.set(key, result);
      })
    );
  }

  return results;
}

/**
 * Format player count display
 */
export function formatPlayerCount(online: number, max: number): string {
  return `${online}/${max}`;
}

/**
 * Get status color class based on player count
 */
export function getStatusColor(online: boolean, playerCount?: number, maxPlayers?: number): string {
  if (!online) return 'text-error';
  if (!playerCount || !maxPlayers) return 'text-success';

  const ratio = playerCount / maxPlayers;
  if (ratio >= 0.9) return 'text-neon-orange'; // Almost full
  if (ratio >= 0.5) return 'text-neon-cyan'; // Half full
  return 'text-success'; // Plenty of room
}

/**
 * Parse MOTD to clean text
 */
export function cleanMotd(motd?: { clean?: string[] }): string {
  if (!motd?.clean) return '';
  return motd.clean.join(' ').trim();
}

/**
 * Clear the status cache (useful for forced refresh)
 */
export function clearStatusCache(): void {
  statusCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { entries: number; keys: string[] } {
  return {
    entries: statusCache.size,
    keys: Array.from(statusCache.keys()),
  };
}

