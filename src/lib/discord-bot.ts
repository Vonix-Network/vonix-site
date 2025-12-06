/**
 * Discord Bot Service
 * 
 * Integrated Discord bot that runs within the Next.js application.
 * Starts automatically when the server starts and listens for messages
 * in the configured Discord channel.
 */

import { Client, GatewayIntentBits, Message, TextChannel, Partials } from 'discord.js';
import { db } from '@/db';
import { discordMessages, siteSettings } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

let discordClient: Client | null = null;
let isConnecting = false;
let channelId: string | null = null;
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
                'discord_chat_channel_id'
            ])
        );

    // Build a map for easy lookup
    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    if (settingsMap.get('discord_chat_enabled') !== 'true') {
        return null;
    }

    const token = settingsMap.get('discord_bot_token');
    const channelIdValue = settingsMap.get('discord_chat_channel_id');

    if (!token || !channelIdValue) {
        return null;
    }

    return {
        token,
        channelId: channelIdValue,
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

    // Only process messages from the configured channel
    if (message.channel.id !== channelId) {
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
        }));

        // Extract attachments
        const attachments = message.attachments.map(att => ({
            url: att.url,
            filename: att.name,
            contentType: att.contentType,
        }));

        // Store in database with conflict handling to prevent race conditions
        // If message already exists (duplicate event), it will be silently ignored
        await db.insert(discordMessages).values({
            discordMessageId: message.id,
            authorId: message.author.id,
            authorName: message.member?.displayName || message.author.displayName || message.author.username,
            authorAvatar: avatarUrl,
            content: message.content,
            isFromWeb: false,
            embeds: embeds.length > 0 ? JSON.stringify(embeds) : null,
            attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
            createdAt: message.createdAt,
        }).onConflictDoNothing();

        console.log(`📥 Discord message received from ${message.author.username}`);
    } catch (error) {
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
    } catch (error) {
        console.error('Error deleting Discord message:', error);
    }
}

/**
 * Handle message update
 */
async function handleMessageUpdate(message: Message) {
    if (message.channel.id !== channelId) return;

    try {
        const embeds = message.embeds.map(embed => ({
            title: embed.title,
            description: embed.description,
            url: embed.url,
            color: embed.color,
            image: embed.image ? { url: embed.image.url } : null,
        }));

        await db
            .update(discordMessages)
            .set({
                content: message.content,
                embeds: embeds.length > 0 ? JSON.stringify(embeds) : null,
            })
            .where(eq(discordMessages.discordMessageId, message.id));
        console.log(`✏️ Discord message updated: ${message.id}`);
    } catch (error) {
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

        channelId = settings.channelId;

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
        discordClient.on('ready', () => {
            console.log(`🤖 Discord bot connected as ${discordClient?.user?.tag}`);
            console.log(`📡 Listening to channel: ${channelId}`);
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

    } catch (error) {
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
        channelId = null;
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
export function getDiscordBotStatus(): { connected: boolean; username?: string; channelId?: string } {
    return {
        connected: discordClient?.isReady() ?? false,
        username: discordClient?.user?.tag,
        channelId: channelId ?? undefined,
    };
}
