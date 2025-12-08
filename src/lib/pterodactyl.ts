/**
 * Pterodactyl Panel API Client
 * 
 * Provides utilities for interacting with Pterodactyl panel's Application API
 * to manage Minecraft servers from the admin dashboard.
 */

import { db } from '@/db';
import { siteSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface PterodactylConfig {
    panelUrl: string;
    apiKey: string;
}

// Cache config for 5 minutes (it rarely changes during a session)
let pterodactylConfigCache: PterodactylConfig | null = null;
let configCacheTimestamp = 0;
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clear the Pterodactyl config cache (call when config is updated)
 */
export function clearPterodactylConfigCache(): void {
    pterodactylConfigCache = null;
    configCacheTimestamp = 0;
}

export interface ServerResources {
    currentState: 'running' | 'starting' | 'stopping' | 'offline';
    isSuspended: boolean;
    resources: {
        memoryBytes: number;
        cpuAbsolute: number;
        diskBytes: number;
        networkRxBytes: number;
        networkTxBytes: number;
        uptime: number;
    };
}

export interface ServerDetails {
    identifier: string;
    uuid: string;
    name: string;
    description: string;
    limits: {
        memory: number;
        swap: number;
        disk: number;
        io: number;
        cpu: number;
    };
    featureLimits: {
        databases: number;
        allocations: number;
        backups: number;
    };
    isSuspended: boolean;
    isInstalling: boolean;
    isTransferring: boolean;
}

export type PowerAction = 'start' | 'stop' | 'restart' | 'kill';

/**
 * Get the global Pterodactyl API configuration from site settings
 * Uses in-memory caching to reduce database queries
 */
export async function getGlobalPterodactylConfig(): Promise<PterodactylConfig | null> {
    const now = Date.now();

    // Return cached config if still valid
    if (pterodactylConfigCache && (now - configCacheTimestamp) < CONFIG_CACHE_TTL) {
        return pterodactylConfigCache;
    }

    const [panelUrlSetting, apiKeySetting] = await Promise.all([
        db.query.siteSettings.findFirst({
            where: eq(siteSettings.key, 'pterodactyl_panel_url'),
        }),
        db.query.siteSettings.findFirst({
            where: eq(siteSettings.key, 'pterodactyl_api_key'),
        }),
    ]);

    if (!panelUrlSetting?.value || !apiKeySetting?.value) {
        pterodactylConfigCache = null;
        return null;
    }

    pterodactylConfigCache = {
        panelUrl: panelUrlSetting.value,
        apiKey: apiKeySetting.value,
    };
    configCacheTimestamp = now;

    return pterodactylConfigCache;
}

/**
 * Save global Pterodactyl configuration
 */
export async function saveGlobalPterodactylConfig(
    panelUrl: string,
    apiKey: string
): Promise<void> {
    const now = new Date();

    // Upsert panel URL
    const existingUrl = await db.query.siteSettings.findFirst({
        where: eq(siteSettings.key, 'pterodactyl_panel_url'),
    });

    if (existingUrl) {
        await db.update(siteSettings)
            .set({ value: panelUrl, updatedAt: now })
            .where(eq(siteSettings.key, 'pterodactyl_panel_url'));
    } else {
        await db.insert(siteSettings).values({
            key: 'pterodactyl_panel_url',
            value: panelUrl,
            category: 'integration',
            description: 'Pterodactyl panel URL for server management',
            isPublic: false,
        });
    }

    // Upsert API key
    const existingKey = await db.query.siteSettings.findFirst({
        where: eq(siteSettings.key, 'pterodactyl_api_key'),
    });

    if (existingKey) {
        await db.update(siteSettings)
            .set({ value: apiKey, updatedAt: now })
            .where(eq(siteSettings.key, 'pterodactyl_api_key'));
    } else {
        await db.insert(siteSettings).values({
            key: 'pterodactyl_api_key',
            value: apiKey,
            category: 'integration',
            description: 'Pterodactyl API key (Application API)',
            isPublic: false,
        });
    }

    // Clear cache so new config is used on next request
    clearPterodactylConfigCache();
}

/**
 * Make an authenticated request to the Pterodactyl API
 */
async function pterodactylFetch<T>(
    config: PterodactylConfig,
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${config.panelUrl.replace(/\/$/, '')}/api/client${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
            ...options.headers,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pterodactyl API error (${response.status}): ${errorText}`);
    }

    // Some endpoints return no content
    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}

/**
 * Test connection to Pterodactyl panel
 */
export async function testConnection(config: PterodactylConfig): Promise<{
    success: boolean;
    message: string;
    serverCount?: number;
}> {
    try {
        const response = await pterodactylFetch<{ data: any[] }>(config, '/');
        return {
            success: true,
            message: 'Connected successfully',
            serverCount: response.data?.length || 0,
        };
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Connection failed',
        };
    }
}

/**
 * Get details for a specific server
 */
export async function getServerDetails(
    config: PterodactylConfig,
    serverId: string
): Promise<ServerDetails> {
    const response = await pterodactylFetch<{ attributes: any }>(
        config,
        `/servers/${serverId}`
    );

    const attr = response.attributes;
    return {
        identifier: attr.identifier,
        uuid: attr.uuid,
        name: attr.name,
        description: attr.description || '',
        limits: {
            memory: attr.limits.memory,
            swap: attr.limits.swap,
            disk: attr.limits.disk,
            io: attr.limits.io,
            cpu: attr.limits.cpu,
        },
        featureLimits: {
            databases: attr.feature_limits.databases,
            allocations: attr.feature_limits.allocations,
            backups: attr.feature_limits.backups,
        },
        isSuspended: attr.is_suspended,
        isInstalling: attr.is_installing,
        isTransferring: attr.is_transferring,
    };
}

/**
 * Get current resource usage for a server
 */
export async function getServerResources(
    config: PterodactylConfig,
    serverId: string
): Promise<ServerResources> {
    const response = await pterodactylFetch<{ attributes: any }>(
        config,
        `/servers/${serverId}/resources`
    );

    const attr = response.attributes;
    return {
        currentState: attr.current_state,
        isSuspended: attr.is_suspended,
        resources: {
            memoryBytes: attr.resources.memory_bytes,
            cpuAbsolute: attr.resources.cpu_absolute,
            diskBytes: attr.resources.disk_bytes,
            networkRxBytes: attr.resources.network_rx_bytes,
            networkTxBytes: attr.resources.network_tx_bytes,
            uptime: attr.resources.uptime,
        },
    };
}

/**
 * Send a power action to a server
 */
export async function sendPowerAction(
    config: PterodactylConfig,
    serverId: string,
    action: PowerAction
): Promise<void> {
    await pterodactylFetch(
        config,
        `/servers/${serverId}/power`,
        {
            method: 'POST',
            body: JSON.stringify({ signal: action }),
        }
    );
}

/**
 * Send a console command to a server
 */
export async function sendCommand(
    config: PterodactylConfig,
    serverId: string,
    command: string
): Promise<void> {
    await pterodactylFetch(
        config,
        `/servers/${serverId}/command`,
        {
            method: 'POST',
            body: JSON.stringify({ command }),
        }
    );
}

/**
 * Get WebSocket connection credentials for console
 */
export async function getWebSocketCredentials(
    config: PterodactylConfig,
    serverId: string
): Promise<{ socket: string; token: string }> {
    const response = await pterodactylFetch<{ data: { socket: string; token: string } }>(
        config,
        `/servers/${serverId}/websocket`
    );
    return response.data;
}

/**
 * List all servers accessible to the API key
 */
export async function listServers(
    config: PterodactylConfig
): Promise<Array<{ identifier: string; name: string; uuid: string }>> {
    const response = await pterodactylFetch<{ data: any[] }>(config, '/');

    return response.data.map((server: any) => ({
        identifier: server.attributes.identifier,
        name: server.attributes.name,
        uuid: server.attributes.uuid,
    }));
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format uptime in seconds to human-readable string
 */
export function formatUptime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}
