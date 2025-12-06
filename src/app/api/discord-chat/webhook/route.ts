import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { discordMessages, siteSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/discord-chat/webhook
 * Receive messages from Discord bot
 * 
 * This endpoint is called by a Discord bot running elsewhere
 * to sync messages from Discord to the website
 */
export async function POST(request: NextRequest) {
    try {
        // Verify bot secret
        const authHeader = request.headers.get('authorization');

        const [botSecretSetting] = await db
            .select()
            .from(siteSettings)
            .where(eq(siteSettings.key, 'discord_bot_secret'));

        if (!botSecretSetting?.value) {
            console.warn('Discord bot secret not configured');
            return NextResponse.json({ error: 'Bot not configured' }, { status: 503 });
        }

        if (authHeader !== `Bearer ${botSecretSetting.value}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { type, message } = body;

        // Handle different event types
        switch (type) {
            case 'message_create': {
                if (!message) {
                    return NextResponse.json({ error: 'Message data required' }, { status: 400 });
                }

                // Don't store messages from the website (they're already stored)
                // Check if author is a webhook and has [WEB] prefix
                if (message.author?.bot && message.author?.username?.startsWith('[WEB]')) {
                    return NextResponse.json({ success: true, action: 'skipped_web_message' });
                }

                // Check if message already exists
                if (message.id) {
                    const [existing] = await db
                        .select()
                        .from(discordMessages)
                        .where(eq(discordMessages.discordMessageId, message.id));

                    if (existing) {
                        return NextResponse.json({ success: true, action: 'already_exists' });
                    }
                }

                // Store the message
                const [inserted] = await db.insert(discordMessages).values({
                    discordMessageId: message.id,
                    authorId: message.author?.id || 'unknown',
                    authorName: message.author?.displayName || message.author?.username || 'Unknown',
                    authorAvatar: message.author?.avatarUrl || null,
                    content: message.content || '',
                    isFromWeb: false,
                    embeds: message.embeds ? JSON.stringify(message.embeds) : null,
                    attachments: message.attachments ? JSON.stringify(message.attachments) : null,
                    createdAt: message.timestamp ? new Date(message.timestamp) : new Date(),
                }).returning();

                return NextResponse.json({
                    success: true,
                    action: 'created',
                    messageId: inserted.id,
                });
            }

            case 'message_delete': {
                // Optionally handle message deletion
                if (message?.id) {
                    await db
                        .delete(discordMessages)
                        .where(eq(discordMessages.discordMessageId, message.id));
                }
                return NextResponse.json({ success: true, action: 'deleted' });
            }

            case 'message_update': {
                // Handle message edits
                if (message?.id && message?.content) {
                    await db
                        .update(discordMessages)
                        .set({
                            content: message.content,
                            embeds: message.embeds ? JSON.stringify(message.embeds) : null,
                        })
                        .where(eq(discordMessages.discordMessageId, message.id));
                }
                return NextResponse.json({ success: true, action: 'updated' });
            }

            case 'bulk_sync': {
                // Bulk sync messages (for initial setup or reconnection)
                const messages = body.messages || [];
                let created = 0;
                let skipped = 0;

                for (const msg of messages) {
                    // Skip web messages
                    if (msg.author?.bot && msg.author?.username?.startsWith('[WEB]')) {
                        skipped++;
                        continue;
                    }

                    // Check if exists
                    if (msg.id) {
                        const [existing] = await db
                            .select()
                            .from(discordMessages)
                            .where(eq(discordMessages.discordMessageId, msg.id));

                        if (existing) {
                            skipped++;
                            continue;
                        }
                    }

                    await db.insert(discordMessages).values({
                        discordMessageId: msg.id,
                        authorId: msg.author?.id || 'unknown',
                        authorName: msg.author?.displayName || msg.author?.username || 'Unknown',
                        authorAvatar: msg.author?.avatarUrl || null,
                        content: msg.content || '',
                        isFromWeb: false,
                        embeds: msg.embeds ? JSON.stringify(msg.embeds) : null,
                        attachments: msg.attachments ? JSON.stringify(msg.attachments) : null,
                        createdAt: msg.timestamp ? new Date(msg.timestamp) : new Date(),
                    });
                    created++;
                }

                return NextResponse.json({
                    success: true,
                    action: 'bulk_synced',
                    created,
                    skipped,
                });
            }

            default:
                return NextResponse.json({ error: 'Unknown event type' }, { status: 400 });
        }
    } catch (error) {
        console.error('Error in discord webhook:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * GET /api/discord-chat/webhook
 * Health check for the bot
 */
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        service: 'discord-chat-webhook',
        timestamp: new Date().toISOString(),
    });
}
