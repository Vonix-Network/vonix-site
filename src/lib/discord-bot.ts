/**
 * Discord Bot Service
 * 
 * Integrated Discord bot that runs within the Next.js application.
 * Starts automatically when the server starts and listens for messages
 * in the configured Discord channels.
 */

import { Client, GatewayIntentBits, Message, TextChannel, Partials } from 'discord.js';
import { db } from '@/db';
import { discordMessages, siteSettings } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { emitDiscordMessage } from './socket-emit';

let discordClient: Client | null = null;
let isConnecting = false;
let chatChannelId: string | null = null;
let viscordChannelId: string | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Get Discord settings from database
 */
async function getDiscordSettings() {
    // Consolidated: fetch all needed settings in a single query
    const settings = await db
        .select()
        .from(siteSettings)
        .where(
            inArray(siteSettings.key, [
                'discord_chat_enabled',
                'discord_bot_token',
                'discord_chat_channel_id',
                'discord_viscord_channel_id'
            ])
        );

    // Build a map for easy lookup
    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    if (settingsMap.get('discord_chat_enabled') !== 'true') {
        return null;
    }

    const token = settingsMap.get('discord_bot_token');
    const chatChannel = settingsMap.get('discord_chat_channel_id');

    if (!token) {
        return null;
    }

    // At least one channel should be configured
    if (!chatChannel && !settingsMap.get('discord_viscord_channel_id')) {
        return null;
    }

    return {
        token,
        chatChannelId: chatChannel || null,
        viscordChannelId: settingsMap.get('discord_viscord_channel_id') || null,
    };
}

/**
 * Handle incoming Discord message
 */
async function handleMessage(message: Message) {
    // IGNORE logic updates per user request:
    // "Discord bot wasnt recieving messages from discord, make sure it readings all messages including those from bots/webhooks."

    // 1. Ignore ourself to prevent loops (if the bot sends a message)
    if (message.author.id === discordClient?.user?.id) {
        return;
    }

    // 2. Ignore our specific [WEB] webhook bridge messages to avoid duplication
    // (Assuming our bridge sends as a webhook with username starting with [WEB])
    if (message.webhookId && message.author.username.startsWith('[WEB]')) {
        return;
    }

    // 3. Previously we ignored all bots (message.author.bot). We removed that check 
    // to allow other bots and webhooks to be processed.

    // Check if message is from one of our monitored channels
    const isChatChannel = chatChannelId && message.channel.id === chatChannelId;
    const isViscordChannel = viscordChannelId && message.channel.id === viscordChannelId;

    if (!isChatChannel && !isViscordChannel) {
        return;
    }

    try {
        // Get author avatar URL
        const avatarUrl = message.author.displayAvatarURL({ size: 64 });

        // Extract embeds
        const embeds = message.embeds.map(embed => ({
            title: embed.title,
            description: embed.description,
            url: embed.url,
            color: embed.color,
            image: embed.image ? { url: embed.image.url } : null,
            thumbnail: embed.thumbnail ? { url: embed.thumbnail.url } : null,
            // Include fields for Viscord-style messages
            fields: embed.fields?.map(f => ({
                name: f.name,
                value: f.value,
                inline: f.inline,
            })) || [],
            footer: embed.footer ? { text: embed.footer.text, iconURL: embed.footer.iconURL } : null,
            author: embed.author ? {
                name: embed.author.name,
                iconURL: embed.author.iconURL,
                url: embed.author.url,
            } : null,
        }));

        // Extract attachments
        const attachments = message.attachments.map(att => ({
            url: att.url,
            filename: att.name,
            contentType: att.contentType,
        }));

        // Store in database with conflict handling to prevent race conditions
        // If message already exists (duplicate event), it will be silently ignored
        const [inserted] = await db.insert(discordMessages).values({
            discordMessageId: message.id,
            authorId: message.author.id,
            authorName: message.member?.displayName || message.author.displayName || message.author.username,
            authorAvatar: avatarUrl,
            content: message.content,
            isFromWeb: false,
            embeds: embeds.length > 0 ? JSON.stringify(embeds) : null,
            attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
            createdAt: message.createdAt,
        }).onConflictDoUpdate({
            target: discordMessages.discordMessageId,
            set: {
                content: message.content,
                embeds: embeds.length > 0 ? JSON.stringify(embeds) : null,
                attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
            }
        }).returning();

        // Emit to connected clients via WebSocket if message was inserted
        if (inserted) {
            emitDiscordMessage({
                id: inserted.id,
                discordMessageId: message.id,
                authorId: message.author.id,
                authorName: message.member?.displayName || message.author.displayName || message.author.username,
                authorAvatar: avatarUrl,
                content: message.content,
                isFromWeb: false,
                embeds: embeds,
                attachments: attachments,
                createdAt: message.createdAt.toISOString(),
            });
        }

        const channelType = isViscordChannel ? 'Viscord' : 'Chat';
        console.log(`📥 Discord ${channelType} message received from ${message.author.username}`);
    } catch (error: any) {
        console.error('Error storing Discord message:', error);
    }
}

/**
 * Handle message deletion
 */
async function handleMessageDelete(messageId: string) {
    try {
        await db
            .delete(discordMessages)
            .where(eq(discordMessages.discordMessageId, messageId));
        console.log(`🗑️ Discord message deleted: ${messageId}`);
    } catch (error: any) {
        console.error('Error deleting Discord message:', error);
    }
}

/**
 * Handle message update
 */
async function handleMessageUpdate(message: Message) {
    // Check if this is from one of our monitored channels
    const isChatChannel = chatChannelId && message.channel.id === chatChannelId;
    const isViscordChannel = viscordChannelId && message.channel.id === viscordChannelId;

    if (!isChatChannel && !isViscordChannel) return;

    try {
        const embeds = message.embeds.map(embed => ({
            title: embed.title,
            description: embed.description,
            url: embed.url,
            color: embed.color,
            image: embed.image ? { url: embed.image.url } : null,
            thumbnail: embed.thumbnail ? { url: embed.thumbnail.url } : null,
            fields: embed.fields?.map(f => ({
                name: f.name,
                value: f.value,
                inline: f.inline,
            })) || [],
            footer: embed.footer ? { text: embed.footer.text, iconURL: embed.footer.iconURL } : null,
            author: embed.author ? {
                name: embed.author.name,
                iconURL: embed.author.iconURL,
                url: embed.author.url,
            } : null,
        }));

        await db
            .update(discordMessages)
            .set({
                content: message.content,
                embeds: embeds.length > 0 ? JSON.stringify(embeds) : null,
            })
            .where(eq(discordMessages.discordMessageId, message.id));
        console.log(`✏️ Discord message updated: ${message.id}`);
    } catch (error: any) {
        console.error('Error updating Discord message:', error);
    }
}

/**
 * Initialize and connect the Discord bot
 */
export async function initDiscordBot() {
    if (isConnecting || discordClient?.isReady()) {
        console.log('🤖 Discord bot already connected or connecting');
        return;
    }

    isConnecting = true;

    try {
        const settings = await getDiscordSettings();

        if (!settings) {
            console.log('🤖 Discord bot not configured or disabled');
            isConnecting = false;
            return;
        }

        chatChannelId = settings.chatChannelId;
        viscordChannelId = settings.viscordChannelId;

        // Create Discord client
        discordClient = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
            partials: [Partials.Message, Partials.Channel],
        });

        // Set up event handlers
        discordClient.on('ready', async () => {
            console.log(`🤖 Discord bot connected as ${discordClient?.user?.tag}`);
            if (chatChannelId) {
                console.log(`📡 Listening to chat channel: ${chatChannelId}`);

                // Backfill recent messages from chat channel
                try {
                    const channel = await discordClient?.channels.fetch(chatChannelId);
                    if (channel && channel.isTextBased()) {
                        console.log('Fetching recent Discord messages for backfill...');
                        const messages = await (channel as TextChannel).messages.fetch({ limit: 50 });
                        console.log(`Found ${messages.size} recent messages to backfill`);

                        // Process messages in reverse order (oldest to newest) to maintain order in logs
                        const sortedMessages = Array.from(messages.values()).reverse();

                        for (const message of sortedMessages) {
                            await handleMessage(message);
                        }
                        console.log('✅ Discord history backfill complete');
                    }
                } catch (error: any) {
                    console.error('Failed to backfill Discord messages:', error);
                }
            }
            if (viscordChannelId) {
                console.log(`📡 Listening to Viscord channel: ${viscordChannelId}`);
            }
            reconnectAttempts = 0; // Reset on successful connection
        });

        discordClient.on('messageCreate', handleMessage);

        discordClient.on('messageDelete', (message) => {
            if (message.id) {
                handleMessageDelete(message.id);
            }
        });

        discordClient.on('messageUpdate', (oldMessage, newMessage) => {
            if (newMessage.partial) return;
            handleMessageUpdate(newMessage as Message);
        });

        discordClient.on('error', (error) => {
            console.error('🤖 Discord bot error:', error);
        });

        discordClient.on('disconnect', async () => {
            console.log('🤖 Discord bot disconnected');
            // Auto-reconnect logic with exponential backoff
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Max 30s delay
                console.log(`🔄 Attempting reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${delay / 1000}s...`);
                setTimeout(async () => {
                    discordClient = null;
                    await initDiscordBot();
                }, delay);
            } else {
                console.error('🤖 Max reconnection attempts reached. Discord bot will not auto-reconnect.');
            }
        });

        // Connect to Discord
        await discordClient.login(settings.token);

    } catch (error: any) {
        console.error('🤖 Failed to initialize Discord bot:', error);
    } finally {
        isConnecting = false;
    }
}

/**
 * Disconnect the Discord bot
 */
export async function stopDiscordBot() {
    if (discordClient) {
        console.log('🤖 Stopping Discord bot...');
        discordClient.destroy();
        discordClient = null;
        chatChannelId = null;
        viscordChannelId = null;
    }
}

/**
 * Restart the Discord bot (useful when settings change)
 */
export async function restartDiscordBot() {
    await stopDiscordBot();
    await initDiscordBot();
}

/**
 * Check if bot is connected
 */
export function isDiscordBotConnected(): boolean {
    return discordClient?.isReady() ?? false;
}

/**
 * Get bot status
 */
export function getDiscordBotStatus(): {
    connected: boolean;
    username?: string;
    chatChannelId?: string;
    viscordChannelId?: string;
} {
    return {
        connected: discordClient?.isReady() ?? false,
        username: discordClient?.user?.tag,
        chatChannelId: chatChannelId ?? undefined,
        viscordChannelId: viscordChannelId ?? undefined,
    };
}
