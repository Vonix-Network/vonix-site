import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/auth-guard';
import { getGlobalPterodactylConfig } from '@/lib/pterodactyl';
import WebSocket from 'ws';

// Keep track of active connections per server
const activeConnections = new Map<string, WebSocket>();

/**
 * GET /api/admin/pterodactyl/server/[identifier]/console
 * Server-Sent Events endpoint that proxies WebSocket console from Wings
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ identifier: string }> }
) {
    const { error } = await requirePermission('servers:read');
    if (error) return error;

    const { identifier } = await params;

    const config = await getGlobalPterodactylConfig();
    if (!config) {
        return new Response(JSON.stringify({ error: 'Pterodactyl is not configured' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Get WebSocket credentials from Pterodactyl
    const wsRes = await fetch(
        `${config.panelUrl.replace(/\/$/, '')}/api/client/servers/${identifier}/websocket`,
        {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
        }
    );

    if (!wsRes.ok) {
        return new Response(JSON.stringify({ error: 'Failed to get console credentials' }), {
            status: wsRes.status,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const wsData = await wsRes.json();
    const { socket: wingsWsUrl, token } = wsData.data;

    // Create SSE response
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            console.log(`[Console SSE] Starting for server ${identifier}`);

            // Close any existing connection for this server
            const existingWs = activeConnections.get(identifier);
            if (existingWs) {
                existingWs.close();
                activeConnections.delete(identifier);
            }

            // Connect to Wings WebSocket with origin header to bypass CORS check
            const ws = new WebSocket(wingsWsUrl, {
                headers: {
                    'Origin': config.panelUrl.replace(/\/$/, ''),
                },
            });
            activeConnections.set(identifier, ws);

            // Send SSE event helper
            const sendEvent = (event: string, data: any) => {
                const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
                try {
                    controller.enqueue(encoder.encode(message));
                } catch (e) {
                    // Stream closed
                }
            };

            ws.on('open', () => {
                console.log(`[Console SSE] WebSocket connected to Wings for ${identifier}`);
                // Authenticate
                ws.send(JSON.stringify({ event: 'auth', args: [token] }));
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());

                    switch (message.event) {
                        case 'auth success':
                            console.log(`[Console SSE] Authenticated with Wings for ${identifier}`);
                            sendEvent('connected', { status: 'connected' });
                            // Request logs
                            ws.send(JSON.stringify({ event: 'send logs', args: [null] }));
                            break;

                        case 'console output':
                            if (message.args?.[0]) {
                                sendEvent('output', { line: message.args[0] });
                            }
                            break;

                        case 'status':
                            sendEvent('status', { status: message.args?.[0] });
                            break;

                        case 'stats':
                            if (message.args?.[0]) {
                                sendEvent('stats', JSON.parse(message.args[0]));
                            }
                            break;

                        case 'token expiring':
                            sendEvent('token_expiring', {});
                            break;

                        case 'token expired':
                            sendEvent('token_expired', {});
                            ws.close();
                            break;
                    }
                } catch (e) {
                    console.error('[Console SSE] Parse error:', e);
                }
            });

            ws.on('error', (error) => {
                console.error(`[Console SSE] WebSocket error for ${identifier}:`, error);
                sendEvent('error', { message: 'WebSocket error' });
            });

            ws.on('close', (code, reason) => {
                console.log(`[Console SSE] WebSocket closed for ${identifier}: ${code} ${reason}`);
                activeConnections.delete(identifier);
                sendEvent('disconnected', { code, reason: reason.toString() });
                controller.close();
            });

            // Handle client disconnect
            request.signal.addEventListener('abort', () => {
                console.log(`[Console SSE] Client disconnected for ${identifier}`);
                ws.close();
                activeConnections.delete(identifier);
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
