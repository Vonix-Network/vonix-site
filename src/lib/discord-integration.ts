/**
 * Discord Integration Library
 * 
 * Handles Discord role management, ticket threading, and slash commands
 */

import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ChannelType, ForumChannel, ThreadChannel, GuildMember, EmbedBuilder, TextInputBuilder } from 'discord.js';
import { db } from '@/db';
import { users, donationRanks, supportTickets, ticketMessages, siteSettings, ticketCategories } from '@/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';

let discordClient: Client | null = null;
let discordRest: REST | null = null;
let listenersInitialized = false;

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

    const settingsMap = new Map(settings.map((s: any) => [s.key, s.value]));

    return {
        botToken: (settingsMap.get('discord_bot_token') as string) || null,
        guildId: (settingsMap.get('discord_guild_id') as string) || null,
        ticketForumId: (settingsMap.get('discord_ticket_forum_id') as string) || null,
        clientId: (settingsMap.get('discord_client_id') as string) || null,
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
            new SlashCommandBuilder()
                .setName('ticketcreator')
                .setDescription('Create a ticket panel with department selector')
                .setDefaultMemberPermissions('0') // Admin only
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to send the ticket panel to')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName('title')
                        .setDescription('Custom title for the panel')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName('description')
                        .setDescription('Custom description for the panel')
                        .setRequired(false)
                ),
            new SlashCommandBuilder()
                .setName('ticket')
                .setDescription('Create a new support ticket')
                .addStringOption(option =>
                    option
                        .setName('subject')
                        .setDescription('Brief description of your issue')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('category')
                        .setDescription('Ticket category')
                        .setRequired(false)
                        .addChoices(
                            { name: '💼 Account Issues', value: 'account' },
                            { name: '💳 Billing & Donations', value: 'billing' },
                            { name: '🔧 Technical Support', value: 'technical' },
                            { name: '❓ General', value: 'general' },
                            { name: '📝 Other', value: 'other' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('priority')
                        .setDescription('Ticket priority')
                        .setRequired(false)
                        .addChoices(
                            { name: '🟢 Low', value: 'low' },
                            { name: '🔵 Normal', value: 'normal' },
                            { name: '🟠 High', value: 'high' },
                            { name: '🔴 Urgent', value: 'urgent' }
                        )
                ),
        ].map((command: any) => command.toJSON());

        await discordRest.put(
            Routes.applicationGuildCommands(settings.clientId, settings.guildId),
            { body: commands }
        );

        console.log('✅ Registered Discord slash commands');
    } catch (error: any) {
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
    } catch (error: any) {
        console.error('Error handling ticket setup command:', error);
        await interaction.reply({
            content: '❌ Failed to setup ticket forum. Please try again.',
            ephemeral: true,
        });
    }
}

/**
 * Handle /ticketcreator command - Creates a ticket panel with department selector
 */
export async function handleTicketCreatorCommand(interaction: any): Promise<void> {
    try {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const title = interaction.options.getString('title') || '🎫 Support Tickets';
        const description = interaction.options.getString('description') ||
            'Need help? Click the button below to create a support ticket and our team will assist you as soon as possible.';

        // Get ticket categories from database
        const categories = await db.select().from(ticketCategories).where(eq(ticketCategories.enabled, true));

        // Build the embed
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(0x00FFFF)
            .setFooter({ text: 'Vonix Network Support' })
            .setTimestamp();

        // Add category info if categories exist
        if (categories.length > 0) {
            const categoryList = categories.map((cat: any) =>
                `${cat.emoji || '🎫'} **${cat.name}**${cat.description ? ` - ${cat.description}` : ''}`
            ).join('\n');
            embed.addFields({ name: 'Available Departments', value: categoryList });
        }

        // Build components
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = await import('discord.js');

        const components: any[] = [];

        // Add category selector if there are multiple categories
        if (categories.length > 1) {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_category_select')
                .setPlaceholder('Select a department...')
                .addOptions(
                    categories.map((cat: any) => ({
                        label: cat.name,
                        description: cat.description?.substring(0, 100) || 'Create a ticket in this category',
                        value: cat.id.toString(),
                        emoji: cat.emoji || '🎫',
                    }))
                );
            components.push(new ActionRowBuilder().addComponents(selectMenu));
        }

        // Add create ticket button
        const createButton = new ButtonBuilder()
            .setCustomId('ticket_create')
            .setLabel('Create Ticket')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎫');

        components.push(new ActionRowBuilder().addComponents(createButton));

        // Send the panel
        await channel.send({
            embeds: [embed],
            components,
        });

        await interaction.reply({
            content: `✅ Ticket panel created in ${channel}!`,
            ephemeral: true,
        });

        console.log(`✅ Ticket panel created in ${channel.id} by ${interaction.user.tag}`);
    } catch (error: any) {
        console.error('Error handling ticketcreator command:', error);
        await interaction.reply({
            content: '❌ Failed to create ticket panel. Please try again.',
            ephemeral: true,
        });
    }
}

/**
 * Handle /ticket command - Create a ticket directly from Discord
 */
export async function handleTicketCommand(interaction: any): Promise<void> {
    try {
        await interaction.deferReply({ ephemeral: true });

        const subject = interaction.options.getString('subject');
        const category = interaction.options.getString('category') || 'general';
        const priority = interaction.options.getString('priority') || 'normal';

        // Get next ticket number
        const result = await db.select({ maxNum: sql<number>`COALESCE(MAX(number), 0)` }).from(supportTickets);
        const ticketNumber = (result[0]?.maxNum || 0) + 1;

        // Create ticket in database
        const [ticket] = await db.insert(supportTickets).values({
            number: ticketNumber,
            userId: null, // Will link if user has account
            subject,
            category,
            priority,
            status: 'open',
            discordUserId: interaction.user.id,
            discordUsername: interaction.user.username,
        }).returning();

        // Create initial message
        await db.insert(ticketMessages).values({
            ticketId: ticket.id,
            userId: null,
            discordUserId: interaction.user.id,
            discordUsername: interaction.user.username,
            message: subject,
            isStaffReply: false,
        });

        // Create Discord thread/channel for the ticket
        const threadId = await createTicketThread(
            ticket.id,
            subject,
            interaction.user.username,
            category,
            priority
        );

        if (threadId) {
            await db.update(supportTickets)
                .set({ discordThreadId: threadId })
                .where(eq(supportTickets.id, ticket.id));
        }

        // Build response embed
        const embed = new EmbedBuilder()
            .setTitle('🎫 Ticket Created!')
            .setDescription(`Your ticket #${ticket.id} has been created successfully.`)
            .setColor(0x00FF00)
            .addFields(
                { name: 'Subject', value: subject, inline: false },
                { name: 'Category', value: category, inline: true },
                { name: 'Priority', value: priority, inline: true },
            )
            .setFooter({ text: `Ticket #${ticket.id}` })
            .setTimestamp();

        if (threadId) {
            embed.addFields({ name: 'Discussion', value: `<#${threadId}>`, inline: false });
        }

        await interaction.editReply({
            embeds: [embed],
        });

        console.log(`✅ Ticket #${ticket.id} created by Discord user ${interaction.user.tag}`);
    } catch (error: any) {
        console.error('Error handling ticket command:', error);
        await interaction.editReply({
            content: '❌ Failed to create ticket. Please try again.',
        });
    }
}

/**
 * Handle /close command - Close the current ticket
 */
export async function handleCloseCommand(interaction: any): Promise<void> {
    try {
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Check if this channel is a ticket thread
        const [ticket] = await db
            .select()
            .from(supportTickets)
            .where(eq(supportTickets.discordThreadId, interaction.channel.id));

        if (!ticket) {
            await interaction.reply({
                content: '❌ This channel is not a ticket thread.',
                ephemeral: true,
            });
            return;
        }

        if (ticket.status === 'closed') {
            await interaction.reply({
                content: '❌ This ticket is already closed.',
                ephemeral: true,
            });
            return;
        }

        // Update ticket status
        await db.update(supportTickets)
            .set({
                status: 'closed',
                closedAt: new Date(),
                closedReason: reason,
                updatedAt: new Date(),
            })
            .where(eq(supportTickets.id, ticket.id));

        // Add system message
        await db.insert(ticketMessages).values({
            ticketId: ticket.id,
            userId: null,
            discordUserId: interaction.user.id,
            discordUsername: interaction.user.username,
            message: `Ticket closed by ${interaction.user.username}. Reason: ${reason}`,
            isStaffReply: true,
            isSystemMessage: true,
        });

        // Close the Discord thread
        await closeTicketThread(interaction.channel.id);

        const embed = new EmbedBuilder()
            .setTitle('🔒 Ticket Closed')
            .setDescription(`This ticket has been closed by ${interaction.user}.`)
            .setColor(0xFF0000)
            .addFields({ name: 'Reason', value: reason })
            .setFooter({ text: `Ticket #${ticket.id}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        console.log(`✅ Ticket #${ticket.id} closed by ${interaction.user.tag}`);
    } catch (error: any) {
        console.error('Error handling close command:', error);
        await interaction.reply({
            content: '❌ Failed to close ticket. Please try again.',
            ephemeral: true,
        });
    }
}

/**
 * Handle ticket creation from button/select menu
 */
export async function handleTicketButtonInteraction(interaction: any, categoryId?: string): Promise<void> {
    try {
        const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

        // Show modal to collect ticket info
        const modal = new ModalBuilder()
            .setCustomId(`ticket_create_modal${categoryId ? `:${categoryId}` : ''}`)
            .setTitle('Create Support Ticket');

        const subjectInput = new TextInputBuilder()
            .setCustomId('ticket_subject')
            .setLabel('Subject')
            .setPlaceholder('Brief description of your issue')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(200);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('ticket_description')
            .setLabel('Description')
            .setPlaceholder('Please describe your issue in detail...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(2000);

        const row1 = new ActionRowBuilder().addComponents(subjectInput);
        const row2 = new ActionRowBuilder().addComponents(descriptionInput);
        modal.addComponents(row1, row2);

        await interaction.showModal(modal);
    } catch (error: any) {
        console.error('Error handling ticket button:', error);
        await interaction.reply({
            content: '❌ Failed to open ticket form. Please try again.',
            ephemeral: true,
        });
    }
}

/**
 * Handle ticket modal submission
 */
export async function handleTicketModalSubmit(interaction: any): Promise<void> {
    try {
        await interaction.deferReply({ ephemeral: true });

        const subject = interaction.fields.getTextInputValue('ticket_subject');
        const description = interaction.fields.getTextInputValue('ticket_description');

        // Get next ticket number
        const result = await db.select({ maxNum: sql<number>`COALESCE(MAX(number), 0)` }).from(supportTickets);
        const ticketNumber = (result[0]?.maxNum || 0) + 1;

        // Create ticket
        const [ticket] = await db.insert(supportTickets).values({
            number: ticketNumber,
            userId: null,
            subject,
            category: 'general',
            priority: 'normal',
            status: 'open',
            discordUserId: interaction.user.id,
            discordUsername: interaction.user.username,
        }).returning();

        // Create initial message
        await db.insert(ticketMessages).values({
            ticketId: ticket.id,
            userId: null,
            discordUserId: interaction.user.id,
            discordUsername: interaction.user.username,
            message: description,
            isStaffReply: false,
        });

        // Create Discord thread
        const threadId = await createTicketThread(
            ticket.id,
            subject,
            interaction.user.username,
            'general',
            'normal'
        );

        if (threadId) {
            await db.update(supportTickets)
                .set({ discordThreadId: threadId })
                .where(eq(supportTickets.id, ticket.id));
        }

        const embed = new EmbedBuilder()
            .setTitle('🎫 Ticket Created!')
            .setDescription(`Your ticket #${ticket.id} has been created.`)
            .setColor(0x00FF00)
            .addFields({ name: 'Subject', value: subject })
            .setTimestamp();

        if (threadId) {
            embed.addFields({ name: 'Discussion', value: `<#${threadId}>` });
        }

        await interaction.editReply({ embeds: [embed] });
    } catch (error: any) {
        console.error('Error handling ticket modal:', error);
        await interaction.editReply({
            content: '❌ Failed to create ticket. Please try again.',
        });
    }
}

/**
 * Setup Discord integration event listeners
 */
export async function setupDiscordIntegrationListeners() {
    // Prevent duplicate registration (hot reload issue)
    if (listenersInitialized) {
        console.log('Discord listeners already initialized, skipping...');
        return;
    }

    const client = await getDiscordClient();
    if (!client) return;

    listenersInitialized = true;
    console.log('Setting up Discord integration listeners...');

    // Handle slash commands
    client.on('interactionCreate', async (interaction: any) => {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            switch (interaction.commandName) {
                case 'ticketsetup':
                    await handleTicketSetupCommand(interaction);
                    break;
                case 'ticketcreator':
                    await handleTicketCreatorCommand(interaction);
                    break;
                case 'ticket':
                    await handleTicketCommand(interaction);
                    break;
                // Note: /close is handled by discord-tickets.ts
            }
            return;
        }

        // Handle button interactions
        if (interaction.isButton()) {
            const customId = interaction.customId;

            if (customId === 'ticket_create') {
                await handleTicketButtonInteraction(interaction);
                return;
            }

            // Handle close button
            if (customId === 'ticket_close') {
                // Check if in a ticket channel
                const [ticket] = await db
                    .select()
                    .from(supportTickets)
                    .where(eq(supportTickets.discordThreadId, interaction.channel.id));

                if (ticket) {
                    await db.update(supportTickets)
                        .set({ status: 'closed', closedAt: new Date(), updatedAt: new Date() })
                        .where(eq(supportTickets.id, ticket.id));

                    await closeTicketThread(interaction.channel.id);

                    await interaction.reply({
                        content: '🔒 Ticket closed.',
                        ephemeral: true,
                    });
                }
                return;
            }
        }

        // Handle select menu interactions
        if (interaction.isStringSelectMenu()) {
            const customId = interaction.customId;

            if (customId === 'ticket_category_select') {
                const categoryId = interaction.values[0];
                await handleTicketButtonInteraction(interaction, categoryId);
                return;
            }
        }

        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            const customId = interaction.customId;

            if (customId.startsWith('ticket_create_modal')) {
                const categoryId = customId.includes(':') ? customId.split(':')[1] : null;
                await handleTicketModalSubmitWithCategory(interaction, categoryId);
                return;
            }
        }
    });

    // Note: Message sync for ticket channels is handled by discord-tickets.ts
    // to avoid duplicate message insertion

    console.log('✅ Discord integration listeners setup');
}

/**
 * Handle ticket modal submission with category
 * Creates ticket in database and either forum thread or text channel in Discord
 */
async function handleTicketModalSubmitWithCategory(interaction: any, categoryId: string | null): Promise<void> {
    try {
        await interaction.deferReply({ ephemeral: true });

        const subject = interaction.fields.getTextInputValue('ticket_subject');
        const description = interaction.fields.getTextInputValue('ticket_description');

        // Get settings to determine which channel type to use
        const settings = await getDiscordIntegrationSettings();

        // Get category info if provided
        let categoryName = 'general';
        if (categoryId) {
            const [cat] = await db.select().from(ticketCategories).where(eq(ticketCategories.id, parseInt(categoryId)));
            if (cat) {
                categoryName = cat.name;
            }
        }

        // Get next ticket number
        const result = await db.select({ maxNum: sql<number>`COALESCE(MAX(number), 0)` }).from(supportTickets);
        const ticketNumber = (result[0]?.maxNum || 0) + 1;

        // Try to link to website user by Discord ID (optional - ticket still works without it)
        let websiteUserId: number | null = null;
        try {
            const linkedUser = await db.query.users.findFirst({
                where: eq(users.discordId, interaction.user.id),
            });
            if (linkedUser) {
                websiteUserId = linkedUser.id;
                console.log(`[Ticket Panel] Linked ticket to website user: ${linkedUser.username} (ID: ${linkedUser.id})`);
            }
        } catch (e) {
            // User lookup failed, continue without linking - ticket still works
            console.log(`[Ticket Panel] No website account linked for Discord user ${interaction.user.username}`);
        }

        // Create ticket in database
        const [ticket] = await db.insert(supportTickets).values({
            number: ticketNumber,
            userId: websiteUserId, // Link if Discord connected to website, null otherwise
            categoryId: categoryId ? parseInt(categoryId) : null,
            subject,
            category: 'general' as const,
            priority: 'normal' as const,
            status: 'open' as const,
            discordUserId: interaction.user.id,
            discordUsername: interaction.user.username,
            lastMessageAt: new Date(),
        }).returning();

        // Create initial message
        await db.insert(ticketMessages).values({
            ticketId: ticket.id,
            userId: websiteUserId,
            discordUserId: interaction.user.id,
            discordUsername: interaction.user.username,
            message: description,
            isStaffReply: false,
        });

        let channelId: string | null = null;
        let channelMention = '';

        // Try Forum Channel first (if configured)
        if (settings.ticketForumId) {
            channelId = await createTicketThread(
                ticket.id,
                subject,
                interaction.user.username,
                categoryName,
                'normal'
            );

            if (channelId) {
                await db.update(supportTickets)
                    .set({ discordThreadId: channelId })
                    .where(eq(supportTickets.id, ticket.id));
                channelMention = `<#${channelId}>`;
            }
        }

        // Fallback: Create text channel if forum not configured or failed
        if (!channelId) {
            // Import ticket category settings for text channel fallback
            const ticketSettings = await db
                .select()
                .from(siteSettings)
                .where(eq(siteSettings.key, 'discord_ticket_category_id'));

            const ticketCategoryId = ticketSettings[0]?.value;

            if (ticketCategoryId && interaction.guild) {
                try {
                    const { ChannelType, PermissionFlagsBits } = require('discord.js');

                    // Get staff role for permissions
                    const staffRoleSettings = await db
                        .select()
                        .from(siteSettings)
                        .where(eq(siteSettings.key, 'discord_ticket_staff_role_id'));
                    const staffRoleId = staffRoleSettings[0]?.value;

                    const channelName = `ticket-${ticketNumber}-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

                    const channel = await interaction.guild.channels.create({
                        name: channelName,
                        type: ChannelType.GuildText,
                        parent: ticketCategoryId,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.id,
                                deny: [PermissionFlagsBits.ViewChannel],
                            },
                            {
                                id: interaction.user.id,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory,
                                    PermissionFlagsBits.AttachFiles,
                                    PermissionFlagsBits.EmbedLinks,
                                ],
                            },
                            ...(staffRoleId ? [{
                                id: staffRoleId,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory,
                                    PermissionFlagsBits.AttachFiles,
                                    PermissionFlagsBits.EmbedLinks,
                                    PermissionFlagsBits.ManageMessages,
                                ],
                            }] : []),
                        ],
                        topic: `Ticket #${ticketNumber} | ${interaction.user.tag} | ${subject.substring(0, 100)}`,
                        reason: `Ticket created by ${interaction.user.tag}`,
                    });

                    channelId = channel.id;
                    channelMention = `${channel}`;

                    // Update ticket with channel ID
                    await db.update(supportTickets)
                        .set({ discordChannelId: channelId })
                        .where(eq(supportTickets.id, ticket.id));

                    // Build ping role
                    const pingRoleSettings = await db
                        .select()
                        .from(siteSettings)
                        .where(eq(siteSettings.key, 'discord_ticket_ping_role_id'));
                    const pingRoleId = pingRoleSettings[0]?.value;

                    // Send opening message in the ticket channel
                    const openingEmbed = new EmbedBuilder()
                        .setColor(0x00FFFF)
                        .setAuthor({
                            name: interaction.member?.displayName || interaction.user.username,
                            iconURL: interaction.user.displayAvatarURL(),
                        })
                        .setTitle(`🎫 Ticket #${ticket.id}`)
                        .setDescription(
                            `Welcome ${interaction.user}!\n\n` +
                            `A staff member will be with you shortly.\n` +
                            `**Your issue:**\n${description}`
                        )
                        .addFields(
                            { name: 'Priority', value: '🔵 Normal', inline: true },
                            { name: 'Status', value: '🟢 Open', inline: true },
                            { name: 'Category', value: categoryName, inline: true },
                        )
                        .setFooter({ text: `Ticket ID: ${ticket.id}` })
                        .setTimestamp();

                    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
                    const actionRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(JSON.stringify({ action: 'claim', ticketId: ticket.id }))
                            .setLabel('Claim')
                            .setEmoji('✋')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(JSON.stringify({ action: 'close', ticketId: ticket.id }))
                            .setLabel('Close')
                            .setEmoji('🔒')
                            .setStyle(ButtonStyle.Danger),
                    );

                    const openingMessage = await channel.send({
                        content: pingRoleId ? `<@&${pingRoleId}> ${interaction.user}` : `${interaction.user}`,
                        embeds: [openingEmbed],
                        components: [actionRow],
                    });

                    // Pin the opening message
                    await openingMessage.pin().catch(() => { });

                    console.log(`✅ Created ticket text channel ${channel.id} for ticket #${ticket.id}`);
                } catch (channelError: any) {
                    console.error('Failed to create ticket text channel:', channelError);
                }
            }
        }

        // Build response for user
        const embed = new EmbedBuilder()
            .setTitle('🎫 Ticket Created!')
            .setDescription(`Your ticket #${ticket.id} has been created.`)
            .setColor(0x00FF00)
            .addFields(
                { name: 'Subject', value: subject },
                { name: 'Category', value: categoryName }
            )
            .setTimestamp();

        if (channelMention) {
            embed.addFields({ name: 'Discussion', value: channelMention });
        } else {
            embed.setDescription(`Your ticket #${ticket.id} has been created.\n\n⚠️ No Discord channel was created - please check the helpdesk on the website or contact an admin to configure the ticket system.`);
        }

        await interaction.editReply({ embeds: [embed] });
    } catch (error: any) {
        console.error('Error handling ticket modal:', error);
        try {
            await interaction.editReply({
                content: '❌ Failed to create ticket. Please try again or contact an administrator.',
            });
        } catch {
            // Interaction may have timed out
        }
    }
}
