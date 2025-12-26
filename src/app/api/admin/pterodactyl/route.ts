import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-guard';
import {
    getGlobalPterodactylConfig,
    saveGlobalPterodactylConfig,
    testConnection,
} from '@/lib/pterodactyl';

/**
 * GET /api/admin/pterodactyl
 * Get global Pterodactyl configuration status
 */
export async function GET() {
    try {
        const { error } = await requirePermission('servers:read');
        if (error) return error;

        const config = await getGlobalPterodactylConfig();

        if (!config) {
            return NextResponse.json({
                configured: false,
                panelUrl: null,
                hasApiKey: false,
            });
        }

        return NextResponse.json({
            configured: true,
            panelUrl: config.panelUrl,
            hasApiKey: !!config.apiKey,
            // Mask the API key for display
            maskedApiKey: config.apiKey
                ? `${config.apiKey.substring(0, 8)}...${config.apiKey.substring(config.apiKey.length - 4)}`
                : null,
        });
    } catch (error: any) {
        console.error('Error fetching Pterodactyl config:', error);
        return NextResponse.json(
            { error: 'Failed to fetch configuration' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/pterodactyl
 * Save global Pterodactyl configuration
 */
export async function POST(request: NextRequest) {
    try {
        const { error } = await requirePermission('servers:write');
        if (error) return error;

        const body = await request.json();
        const { panelUrl, apiKey, testOnly } = body;

        if (!panelUrl || !apiKey) {
            return NextResponse.json(
                { error: 'Panel URL and API key are required' },
                { status: 400 }
            );
        }

        // Clean up panel URL (remove trailing slash)
        const cleanPanelUrl = panelUrl.replace(/\/+$/, '');

        // Test the connection first
        const testResult = await testConnection({
            panelUrl: cleanPanelUrl,
            apiKey,
        });

        if (!testResult.success) {
            return NextResponse.json(
                { error: `Connection failed: ${testResult.message}` },
                { status: 400 }
            );
        }

        // If only testing, return success without saving
        if (testOnly) {
            return NextResponse.json({
                success: true,
                message: 'Connection successful',
                serverCount: testResult.serverCount,
            });
        }

        // Save the configuration
        await saveGlobalPterodactylConfig(cleanPanelUrl, apiKey);

        return NextResponse.json({
            success: true,
            message: 'Configuration saved successfully',
            serverCount: testResult.serverCount,
        });
    } catch (error: any) {
        console.error('Error saving Pterodactyl config:', error);
        return NextResponse.json(
            { error: 'Failed to save configuration' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/pterodactyl
 * Clear Pterodactyl configuration
 */
export async function DELETE() {
    try {
        const { error } = await requirePermission('servers:write');
        if (error) return error;

        // Clear by setting empty values
        await saveGlobalPterodactylConfig('', '');

        return NextResponse.json({
            success: true,
            message: 'Configuration cleared',
        });
    } catch (error: any) {
        console.error('Error clearing Pterodactyl config:', error);
        return NextResponse.json(
            { error: 'Failed to clear configuration' },
            { status: 500 }
        );
    }
}
