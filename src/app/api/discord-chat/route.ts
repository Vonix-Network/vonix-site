import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { db } from '@/db';
import { discordMessages, siteSettings, users } from '@/db/schema';
import { desc, eq, gt } from 'drizzle-orm';
import { emitDiscordMessage } from '@/lib/socket-emit';

/**
 * GET /api/discord-chat
 * Fetch recent Discord chat messages
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const after = searchParams.get('after'); // Message ID to fetch after (for polling)
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

        let messages;

        // If 'after' is provided, only get messages newer than that ID
        if (after) {
            const afterId = parseInt(after);
            if (!isNaN(afterId)) {
                messages = await db
                    .select()
                    .from(discordMessages)
                    .where(gt(discordMessages.id, afterId))
                    .orderBy(desc(discordMessages.createdAt))
                    .limit(limit);
            } else {
                messages = await db
                    .select()
                    .from(discordMessages)
                    .orderBy(desc(discordMessages.createdAt))
                    .limit(limit);
            }
        } else {
            messages = await db
                .select()
                .from(discordMessages)
                .orderBy(desc(discordMessages.createdAt))
                .limit(limit);
        }

        // Reverse to get chronological order
        messages.reverse();

        return NextResponse.json({
            success: true,
            messages: messages.map(m => ({
                id: m.id,
                discordMessageId: m.discordMessageId,
                authorId: m.authorId,
                authorName: m.authorName,
                authorAvatar: m.authorAvatar,
                content: m.content,
                isFromWeb: m.isFromWeb,
                webUserId: m.webUserId,
                embeds: m.embeds ? JSON.parse(m.embeds) : [],
                attachments: m.attachments ? JSON.parse(m.attachments) : [],
                createdAt: m.createdAt,
            })),
        });
    } catch (error) {
        console.error('Error fetching discord messages:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}

/**
 * POST /api/discord-chat
 * Send a message to Discord via webhook
 */
export async function POST(request: NextRequest) {
    try {
        // Require authentication
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { content } = await request.json();

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
        }

        if (content.length > 2000) {
            return NextResponse.json({ error: 'Message too long (max 2000 characters)' }, { status: 400 });
        }

        // Get Discord webhook URL from settings
        const [webhookSetting] = await db
            .select()
            .from(siteSettings)
            .where(eq(siteSettings.key, 'discord_chat_webhook'));

        if (!webhookSetting?.value) {
            return NextResponse.json(
                { error: 'Discord chat is not configured' },
                { status: 503 }
            );
        }

        // Get user info
        const userId = parseInt(session.user.id as string);
        const [user] = await db.select().from(users).where(eq(users.id, userId));

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const username = `[WEB] ${user.username}`;
        const avatarUrl = user.minecraftUsername
            ? `https://mc-heads.net/avatar/${user.minecraftUsername}/64`
            : undefined;

        // Send to Discord webhook
        const webhookResponse = await fetch(webhookSetting.value, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                avatar_url: avatarUrl,
                content: content.trim(),
            }),
        });

        if (!webhookResponse.ok) {
            const errorText = await webhookResponse.text();
            console.error('Discord webhook error:', errorText);
            return NextResponse.json(
                { error: 'Failed to send message to Discord' },
                { status: 502 }
            );
        }

        // Store the message in our database too
        const [inserted] = await db.insert(discordMessages).values({
            authorId: `web:${userId}`,
            authorName: username,
            authorAvatar: avatarUrl,
            content: content.trim(),
            isFromWeb: true,
            webUserId: userId,
            createdAt: new Date(),
        }).returning();

        // Emit to all connected clients via WebSocket
        emitDiscordMessage({
            id: inserted.id,
            authorId: inserted.authorId,
            authorName: inserted.authorName,
            authorAvatar: inserted.authorAvatar,
            content: inserted.content,
            isFromWeb: inserted.isFromWeb,
            webUserId: inserted.webUserId,
            embeds: [],
            attachments: [],
            createdAt: inserted.createdAt?.toISOString(),
        });

        return NextResponse.json({
            success: true,
            message: {
                id: inserted.id,
                authorId: inserted.authorId,
                authorName: inserted.authorName,
                authorAvatar: inserted.authorAvatar,
                content: inserted.content,
                isFromWeb: inserted.isFromWeb,
                webUserId: inserted.webUserId,
                createdAt: inserted.createdAt,
            },
        });
    } catch (error) {
        console.error('Error sending discord message:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}

