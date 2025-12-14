/**
 * Discord Integration Library
 * 
 * Handles Discord role management, ticket threading, and slash commands
 */

import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ChannelType, ForumChannel, ThreadChannel, GuildMember, EmbedBuilder } from 'discord.js';
import { db } from '@/db';
import { users, donationRanks, supportTickets, ticketMessages, siteSettings } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

let discordClient: Client | null = null;
let discordRest: REST | null = null;

/**
 * Get Discord settings from database
 */
export async function getDiscordIntegrationSettings() {
    const settings = await db
        .select()
        .from(siteSettings)
        .where(
            inArray(siteSettings.key, [
                'discord_bot_token',
                'discord_guild_id',
                'discord_ticket_forum_id',
                'discord_client_id',
            ])
        );

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    return {
        botToken: settingsMap.get('discord_bot_token') || null,
        guildId: settingsMap.get('discord_guild_id') || null,
        ticketForumId: settingsMap.get('discord_ticket_forum_id') || null,
        clientId: settingsMap.get('discord_client_id') || null,
    };
}

/**
 * Initialize Discord client for role management and tickets
 */
export async function initDiscordIntegration() {
    const settings = await getDiscordIntegrationSettings();

    if (!settings.botToken) {
        console.log('Discord integration not configured');
        return null;
    }

    if (!discordClient) {
        discordClient = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
        });

        await discordClient.login(settings.botToken);
        console.log('✅ Discord integration client initialized');
    }

    return discordClient;
}

/**
 * Get Discord client (initialize if needed)
 */
export async function getDiscordClient(): Promise<Client | null> {
    if (discordClient?.isReady()) {
        return discordClient;
    }
    return await initDiscordIntegration();
}

/**
 * Assign Discord role to user
 */
export async function assignDiscordRole(userId: number, roleId: string): Promise<boolean> {
    try {
        const client = await getDiscordClient();
        if (!client) return false;

        const settings = await getDiscordIntegrationSettings();
        if (!settings.guildId) return false;

        // Get user's Discord ID
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        if (!user?.discordId) {
            console.log(`User ${userId} has no linked Discord account`);
            return false;
        }

        const guild = await client.guilds.fetch(settings.guildId);
        const member = await guild.members.fetch(user.discordId);

        if (!member) {
            console.log(`Discord member not found for user ${userId}`);
            return false;
        }

        await member.roles.add(roleId);
        console.log(`✅ Assigned role ${roleId} to Discord user ${user.discordId}`);
        return true;
    } catch (error) {
        console.error('Error assigning Discord role:', error);
        return false;
    }
}

/**
 * Remove Discord role from user
 */
export async function removeDiscordRole(userId: number, roleId: string): Promise<boolean> {
    try {
        const client = await getDiscordClient();
        if (!client) return false;

        const settings = await getDiscordIntegrationSettings();
        if (!settings.guildId) return false;

        // Get user's Discord ID
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        if (!user?.discordId) {
            console.log(`User ${userId} has no linked Discord account`);
            return false;
        }

        const guild = await client.guilds.fetch(settings.guildId);
        const member = await guild.members.fetch(user.discordId);

        if (!member) {
            console.log(`Discord member not found for user ${userId}`);
            return false;
        }

        await member.roles.remove(roleId);
        console.log(`✅ Removed role ${roleId} from Discord user ${user.discordId}`);
        return true;
    } catch (error) {
        console.error('Error removing Discord role:', error);
        return false;
    }
}

/**
 * Update user's Discord role based on donation rank
 */
export async function updateUserDiscordRole(userId: number, newRankId: string | null, oldRankId: string | null = null): Promise<void> {
    try {
        // Remove old rank role if exists
        if (oldRankId) {
            const [oldRank] = await db.select().from(donationRanks).where(eq(donationRanks.id, oldRankId));
            if (oldRank?.discordRoleId) {
                await removeDiscordRole(userId, oldRank.discordRoleId);
            }
        }

        // Add new rank role if exists
        if (newRankId) {
            const [newRank] = await db.select().from(donationRanks).where(eq(donationRanks.id, newRankId));
            if (newRank?.discordRoleId) {
                await assignDiscordRole(userId, newRank.discordRoleId);
            }
        }
    } catch (error) {
        console.error('Error updating user Discord role:', error);
    }
}

/**
 * Create Discord forum thread for ticket
 */
export async function createTicketThread(ticketId: number, subject: string, username: string, category: string, priority: string): Promise<string | null> {
    try {
        const client = await getDiscordClient();
        if (!client) return null;

        const settings = await getDiscordIntegrationSettings();
        if (!settings.ticketForumId) {
            console.log('Discord ticket forum not configured');
            return null;
        }

        const channel = await client.channels.fetch(settings.ticketForumId);
        if (!channel || channel.type !== ChannelType.GuildForum) {
            console.log('Invalid ticket forum channel');
            return null;
        }

        const forumChannel = channel as ForumChannel;

        // Create priority emoji
        const priorityEmoji = {
            low: '🟢',
            normal: '🔵',
            high: '🟠',
            urgent: '🔴',
        }[priority] || '🔵';

        // Create embed for initial message
        const embed = new EmbedBuilder()
            .setTitle(`🎫 Ticket #${ticketId}`)
            .setDescription(subject)
            .addFields(
                { name: 'User', value: username, inline: true },
                { name: 'Category', value: category, inline: true },
                { name: 'Priority', value: `${priorityEmoji} ${priority}`, inline: true },
            )
            .setColor(priority === 'urgent' ? 0xFF0000 : priority === 'high' ? 0xFFA500 : priority === 'normal' ? 0x0099FF : 0x00FF00)
            .setTimestamp();

        // Create thread
        const thread = await forumChannel.threads.create({
            name: `${priorityEmoji} Ticket #${ticketId} - ${subject.substring(0, 80)}`,
            message: {
                embeds: [embed],
            },
        });

        console.log(`✅ Created Discord thread ${thread.id} for ticket #${ticketId}`);
        return thread.id;
    } catch (error) {
        console.error('Error creating ticket thread:', error);
        return null;
    }
}

/**
 * Send message to ticket thread
 */
export async function sendTicketMessage(threadId: string, message: string, username: string, isStaff: boolean): Promise<boolean> {
    try {
        const client = await getDiscordClient();
        if (!client) return false;

        const thread = await client.channels.fetch(threadId) as ThreadChannel;
        if (!thread) return false;

        const embed = new EmbedBuilder()
            .setAuthor({ name: username })
            .setDescription(message)
            .setColor(isStaff ? 0x00FFFF : 0x808080)
            .setTimestamp();

        if (isStaff) {
            embed.setFooter({ text: '✅ Staff Reply' });
        }

        await thread.send({ embeds: [embed] });
        return true;
    } catch (error) {
        console.error('Error sending ticket message to Discord:', error);
        return false;
    }
}

/**
 * Close ticket thread
 */
export async function closeTicketThread(threadId: string): Promise<boolean> {
    try {
        const client = await getDiscordClient();
        if (!client) return false;

        const thread = await client.channels.fetch(threadId) as ThreadChannel;
        if (!thread) return false;

        await thread.setArchived(true);
        await thread.setLocked(true);

        console.log(`✅ Closed Discord thread ${threadId}`);
        return true;
    } catch (error) {
        console.error('Error closing ticket thread:', error);
        return false;
    }
}

/**
 * Register slash commands
 */
export async function registerSlashCommands() {
    try {
        const settings = await getDiscordIntegrationSettings();
        if (!settings.botToken || !settings.clientId || !settings.guildId) {
            console.log('Discord slash commands not configured');
            return;
        }

        if (!discordRest) {
            discordRest = new REST({ version: '10' }).setToken(settings.botToken);
        }

        const commands = [
            new SlashCommandBuilder()
                .setName('ticketsetup')
                .setDescription('Setup ticket forum channel')
                .setDefaultMemberPermissions('0') // Admin only
                .addChannelOption(option =>
                    option
                        .setName('forum')
                        .setDescription('The forum channel for tickets')
                        .addChannelTypes(ChannelType.GuildForum)
                        .setRequired(true)
                ),
        ].map(command => command.toJSON());

        await discordRest.put(
            Routes.applicationGuildCommands(settings.clientId, settings.guildId),
            { body: commands }
        );

        console.log('✅ Registered Discord slash commands');
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
}

/**
 * Handle /ticketsetup command
 */
export async function handleTicketSetupCommand(interaction: any): Promise<void> {
    try {
        const forumChannel = interaction.options.getChannel('forum');

        if (forumChannel.type !== ChannelType.GuildForum) {
            await interaction.reply({
                content: '❌ Please select a forum channel!',
                ephemeral: true,
            });
            return;
        }

        // Save to database
        await db
            .insert(siteSettings)
            .values({
                key: 'discord_ticket_forum_id',
                value: forumChannel.id,
                category: 'discord',
                description: 'Discord forum channel for support tickets',
                isPublic: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .onConflictDoUpdate({
                target: siteSettings.key,
                set: {
                    value: forumChannel.id,
                    updatedAt: new Date(),
                },
            });

        await interaction.reply({
            content: `✅ Ticket forum set to ${forumChannel}!\n\nAll new support tickets will create threads in this forum.`,
            ephemeral: true,
        });

        console.log(`✅ Ticket forum set to ${forumChannel.id} by ${interaction.user.tag}`);
    } catch (error) {
        console.error('Error handling ticket setup command:', error);
        await interaction.reply({
            content: '❌ Failed to setup ticket forum. Please try again.',
            ephemeral: true,
        });
    }
}

/**
 * Setup Discord integration event listeners
 */
export async function setupDiscordIntegrationListeners() {
    const client = await getDiscordClient();
    if (!client) return;

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'ticketsetup') {
            await handleTicketSetupCommand(interaction);
        }
    });

    // Listen for messages in ticket threads
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (!message.channel.isThread()) return;

        try {
            // Check if this is a ticket thread
            const [ticket] = await db
                .select()
                .from(supportTickets)
                .where(eq(supportTickets.discordThreadId, message.channel.id));

            if (!ticket) return;

            // Find or create user from Discord
            let user = await db.query.users.findFirst({
                where: eq(users.discordId, message.author.id),
            });

            if (!user) {
                console.log(`Discord user ${message.author.tag} not linked to website account`);
                return;
            }

            // Check if user is staff
            const isStaff = ['admin', 'superadmin', 'moderator'].includes(user.role);

            // Add message to database
            await db.insert(ticketMessages).values({
                ticketId: ticket.id,
                userId: user.id,
                message: message.content,
                isStaffReply: isStaff,
                createdAt: new Date(),
            });

            // Update ticket timestamp
            await db
                .update(supportTickets)
                .set({
                    status: isStaff ? 'waiting' : ticket.status === 'waiting' ? 'open' : ticket.status,
                    updatedAt: new Date(),
                })
                .where(eq(supportTickets.id, ticket.id));

            console.log(`✅ Synced Discord message to ticket #${ticket.id}`);
        } catch (error) {
            console.error('Error syncing Discord message to ticket:', error);
        }
    });

    console.log('✅ Discord integration listeners setup');
}
