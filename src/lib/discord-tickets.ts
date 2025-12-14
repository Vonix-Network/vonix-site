/**
 * Discord Tickets Integration
 * Full-featured ticket system matching discord-tickets bot functionality
 * 
 * Commands: /new, /close, /claim, /release, /add, /remove, /transfer, /priority, /tickets, /transcript
 * Buttons: create, close, claim, unclaim, edit
 * Modals: questions, topic, feedback
 */

import {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    ChannelType,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits,
    MessageFlags,
    TextChannel,
    CategoryChannel,
    ThreadChannel,
    ForumChannel,
} from 'discord.js';
import { db } from '@/db';
import { users, supportTickets, ticketMessages, ticketCategories, ticketQuestions, ticketAnswers, siteSettings, ticketFeedback, ticketTags } from '@/db/schema';
import { eq, and, desc, asc, inArray, sql, lt } from 'drizzle-orm';

let discordClient: Client | null = null;
let discordRest: REST | null = null;

// ============================================================================
// CONFIGURATION & SETTINGS
// ============================================================================

interface DiscordTicketSettings {
    botToken: string | null;
    clientId: string | null;
    guildId: string | null;
    ticketForumId: string | null;
    ticketCategoryId: string | null;
    staffRoleId: string | null;
    pingRoleId: string | null;
    logChannelId: string | null;
}

export async function getDiscordTicketSettings(): Promise<DiscordTicketSettings> {
    const settings = await db
        .select()
        .from(siteSettings)
        .where(
            inArray(siteSettings.key, [
                'discord_bot_token',
                'discord_client_id',
                'discord_guild_id',
                'discord_ticket_forum_id',
                'discord_ticket_category_id',
                'discord_ticket_staff_role_id',
                'discord_ticket_ping_role_id',
                'discord_ticket_log_channel_id',
            ])
        );

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    return {
        botToken: settingsMap.get('discord_bot_token') || null,
        clientId: settingsMap.get('discord_client_id') || null,
        guildId: settingsMap.get('discord_guild_id') || null,
        ticketForumId: settingsMap.get('discord_ticket_forum_id') || null,
        ticketCategoryId: settingsMap.get('discord_ticket_category_id') || null,
        staffRoleId: settingsMap.get('discord_ticket_staff_role_id') || null,
        pingRoleId: settingsMap.get('discord_ticket_ping_role_id') || null,
        logChannelId: settingsMap.get('discord_ticket_log_channel_id') || null,
    };
}

// ============================================================================
// CLIENT INITIALIZATION
// ============================================================================

export async function getDiscordClient(): Promise<Client | null> {
    if (discordClient?.isReady()) return discordClient;

    const settings = await getDiscordTicketSettings();
    if (!settings.botToken) return null;

    try {
        discordClient = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages,
            ],
        });

        await discordClient.login(settings.botToken);
        console.log('✅ Discord ticket bot connected');
        return discordClient;
    } catch (error) {
        console.error('Failed to initialize Discord client:', error);
        return null;
    }
}

// ============================================================================
// SLASH COMMANDS REGISTRATION
// ============================================================================

export async function registerTicketCommands() {
    const settings = await getDiscordTicketSettings();
    if (!settings.botToken || !settings.clientId || !settings.guildId) {
        console.log('Discord ticket commands not configured');
        return;
    }

    if (!discordRest) {
        discordRest = new REST({ version: '10' }).setToken(settings.botToken);
    }

    const commands = [
        // /new - Create a new ticket
        new SlashCommandBuilder()
            .setName('new')
            .setDescription('Create a new support ticket')
            .addStringOption(option =>
                option.setName('topic')
                    .setDescription('Brief description of your issue')
                    .setRequired(false)
            ),

        // /close - Close a ticket
        new SlashCommandBuilder()
            .setName('close')
            .setDescription('Close the current ticket')
            .addStringOption(option =>
                option.setName('reason')
                    .setDescription('Reason for closing')
                    .setRequired(false)
            ),

        // /claim - Claim a ticket
        new SlashCommandBuilder()
            .setName('claim')
            .setDescription('Claim this ticket to handle it'),

        // /release - Release a claimed ticket
        new SlashCommandBuilder()
            .setName('release')
            .setDescription('Release this ticket so others can claim it'),

        // /add - Add member to ticket
        new SlashCommandBuilder()
            .setName('add')
            .setDescription('Add a member to this ticket')
            .addUserOption(option =>
                option.setName('member')
                    .setDescription('Member to add')
                    .setRequired(true)
            ),

        // /remove - Remove member from ticket
        new SlashCommandBuilder()
            .setName('remove')
            .setDescription('Remove a member from this ticket')
            .addUserOption(option =>
                option.setName('member')
                    .setDescription('Member to remove')
                    .setRequired(true)
            ),

        // /transfer - Transfer ticket ownership
        new SlashCommandBuilder()
            .setName('transfer')
            .setDescription('Transfer ticket ownership to another member')
            .addUserOption(option =>
                option.setName('member')
                    .setDescription('New ticket owner')
                    .setRequired(true)
            ),

        // /priority - Set ticket priority
        new SlashCommandBuilder()
            .setName('priority')
            .setDescription('Set the priority of this ticket')
            .addStringOption(option =>
                option.setName('level')
                    .setDescription('Priority level')
                    .setRequired(true)
                    .addChoices(
                        { name: '🔴 Urgent', value: 'urgent' },
                        { name: '🟠 High', value: 'high' },
                        { name: '🔵 Normal', value: 'normal' },
                        { name: '🟢 Low', value: 'low' }
                    )
            ),

        // /tickets - List tickets
        new SlashCommandBuilder()
            .setName('tickets')
            .setDescription('List your open tickets'),

        // /transcript - Get ticket transcript
        new SlashCommandBuilder()
            .setName('transcript')
            .setDescription('Get the transcript of a ticket')
            .addStringOption(option =>
                option.setName('ticket_id')
                    .setDescription('Ticket ID (leave empty for current ticket)')
                    .setRequired(false)
            ),

        // /panel - Create ticket panel (admin only)
        new SlashCommandBuilder()
            .setName('panel')
            .setDescription('Create a ticket creation panel')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addChannelOption(option =>
                option.setName('channel')
                    .setDescription('Channel to send the panel to')
                    .setRequired(false)
            )
            .addStringOption(option =>
                option.setName('title')
                    .setDescription('Panel title')
                    .setRequired(false)
            )
            .addStringOption(option =>
                option.setName('description')
                    .setDescription('Panel description')
                    .setRequired(false)
            ),

        // /setup - Setup ticket system (admin only)
        new SlashCommandBuilder()
            .setName('setup')
            .setDescription('Setup the ticket system')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addChannelOption(option =>
                option.setName('category')
                    .setDescription('Category for ticket channels')
                    .addChannelTypes(ChannelType.GuildCategory)
                    .setRequired(false)
            )
            .addRoleOption(option =>
                option.setName('staff_role')
                    .setDescription('Staff role that can see tickets')
                    .setRequired(false)
            ),

        // /move - Move ticket to category
        new SlashCommandBuilder()
            .setName('move')
            .setDescription('Move ticket to another category')
            .addIntegerOption(option =>
                option.setName('category')
                    .setDescription('Target category')
                    .setRequired(true)
                    .setAutocomplete(true)
            ),

        // /rename - Rename ticket channel
        new SlashCommandBuilder()
            .setName('rename')
            .setDescription('Rename the ticket channel')
            .addStringOption(option =>
                option.setName('name')
                    .setDescription('New channel name')
                    .setRequired(true)
            ),

        // /topic - Change ticket topic
        new SlashCommandBuilder()
            .setName('topic')
            .setDescription('Change the ticket topic'),

        // /tag - Use predefined response
        new SlashCommandBuilder()
            .setName('tag')
            .setDescription('Send a predefined response')
            .addIntegerOption(option =>
                option.setName('tag')
                    .setDescription('Tag to use')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
            .addUserOption(option =>
                option.setName('for')
                    .setDescription('Mention user')
                    .setRequired(false)
            ),

        // /force-close - Force close tickets
        new SlashCommandBuilder()
            .setName('force-close')
            .setDescription('Force close tickets')
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
            .addStringOption(option =>
                option.setName('ticket')
                    .setDescription('Specific ticket ID')
                    .setRequired(false)
                    .setAutocomplete(true)
            )
            .addStringOption(option =>
                option.setName('time')
                    .setDescription('Close inactive tickets (e.g. 24h, 7d)')
                    .setRequired(false)
            )
            .addStringOption(option =>
                option.setName('reason')
                    .setDescription('Close reason')
                    .setRequired(false)
            ),

        // /help - Help command
        new SlashCommandBuilder()
            .setName('help')
            .setDescription('Show ticket commands help'),
    ].map(command => command.toJSON());

    try {
        await discordRest.put(
            Routes.applicationGuildCommands(settings.clientId, settings.guildId),
            { body: commands }
        );
        console.log('✅ Registered Discord ticket commands');
    } catch (error) {
        console.error('Error registering ticket commands:', error);
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function isStaff(guildId: string, userId: string): Promise<boolean> {
    const settings = await getDiscordTicketSettings();
    if (!settings.staffRoleId || !discordClient) return false;

    try {
        const guild = discordClient.guilds.cache.get(guildId);
        if (!guild) return false;

        const member = await guild.members.fetch(userId);
        return member.roles.cache.has(settings.staffRoleId);
    } catch {
        return false;
    }
}

async function getTicketFromChannel(channelId: string) {
    const [ticket] = await db
        .select()
        .from(supportTickets)
        .where(eq(supportTickets.discordChannelId, channelId));
    return ticket;
}

async function getNextTicketNumber(): Promise<number> {
    const result = await db
        .select({ maxId: sql<number>`COALESCE(MAX(id), 0)` })
        .from(supportTickets);
    return (result[0]?.maxId || 0) + 1;
}

function getPriorityEmoji(priority: string): string {
    const emojis: Record<string, string> = {
        urgent: '🔴',
        high: '🟠',
        normal: '🔵',
        low: '🟢',
    };
    return emojis[priority] || '🔵';
}

function getStatusEmoji(status: string): string {
    const emojis: Record<string, string> = {
        open: '🟢',
        in_progress: '🔵',
        waiting: '🟡',
        resolved: '✅',
        closed: '🔒',
    };
    return emojis[status] || '⚪';
}

// ============================================================================
// TICKET CREATION
// ============================================================================

export async function createTicket(
    interaction: any,
    topic?: string,
    categoryId?: number
): Promise<void> {
    const settings = await getDiscordTicketSettings();
    if (!settings.ticketCategoryId) {
        await interaction.reply({
            content: '❌ Ticket system is not configured. Please contact an administrator.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const member = interaction.member;
    const ticketNumber = await getNextTicketNumber();

    // Check for existing open tickets
    const existingTickets = await db
        .select()
        .from(supportTickets)
        .where(
            and(
                eq(supportTickets.discordUserId, interaction.user.id),
                eq(supportTickets.status, 'open')
            )
        );

    if (existingTickets.length >= 3) {
        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Ticket Limit Reached')
                    .setDescription('You already have 3 open tickets. Please close some before creating new ones.'),
            ],
        });
        return;
    }

    // Create ticket channel
    const channelName = `ticket-${ticketNumber}-${member.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
    
    try {
        const channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: settings.ticketCategoryId,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: member.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.EmbedLinks,
                    ],
                },
                ...(settings.staffRoleId ? [{
                    id: settings.staffRoleId,
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
            topic: `Ticket #${ticketNumber} | ${member.user.tag}${topic ? ` | ${topic}` : ''}`,
            reason: `Ticket created by ${member.user.tag}`,
        });

        // Create ticket in database
        const [ticket] = await db.insert(supportTickets).values({
            number: ticketNumber,
            userId: null,
            categoryId: categoryId || null,
            subject: topic || `Ticket #${ticketNumber}`,
            topic: topic || null,
            category: 'general' as const,
            priority: 'normal' as const,
            status: 'open' as const,
            discordUserId: interaction.user.id,
            discordUsername: interaction.user.username,
            discordChannelId: channel.id,
            openingMessageId: null,
            lastMessageAt: new Date(),
        }).returning();

        // Create initial message
        if (topic) {
            await db.insert(ticketMessages).values({
                ticketId: ticket.id,
                discordUserId: interaction.user.id,
                discordUsername: interaction.user.username,
                message: topic,
                isStaffReply: false,
            });
        }

        // Build opening message embed
        const openingEmbed = new EmbedBuilder()
            .setColor(0x00FFFF)
            .setAuthor({
                name: member.displayName,
                iconURL: member.displayAvatarURL(),
            })
            .setTitle(`🎫 Ticket #${ticket.id}`)
            .setDescription(
                `Welcome ${member}!\n\n` +
                `A staff member will be with you shortly.\n` +
                `Please describe your issue in detail while you wait.`
            )
            .addFields(
                { name: 'Priority', value: `${getPriorityEmoji('normal')} Normal`, inline: true },
                { name: 'Status', value: `${getStatusEmoji('open')} Open`, inline: true },
            )
            .setFooter({ text: `Ticket ID: ${ticket.id}` })
            .setTimestamp();

        if (topic) {
            openingEmbed.addFields({ name: 'Topic', value: topic });
        }

        // Build action buttons
        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
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

        // Send opening message
        const openingMessage = await channel.send({
            content: settings.pingRoleId ? `<@&${settings.pingRoleId}> ${member}` : `${member}`,
            embeds: [openingEmbed],
            components: [actionRow],
        });

        // Pin the opening message
        await openingMessage.pin().catch(() => {});

        // Clean up system messages
        const messages = await channel.messages.fetch({ limit: 5 });
        for (const msg of messages.values()) {
            if (msg.system) {
                await msg.delete().catch(() => {});
            }
        }

        // Reply to user
        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ Ticket Created!')
                    .setDescription(`Your ticket has been created: ${channel}`)
                    .addFields(
                        { name: 'Ticket ID', value: `#${ticket.id}`, inline: true },
                    ),
            ],
        });

        // Log ticket creation
        await logTicketEvent('create', ticket.id, interaction.user.id, `Ticket created by ${interaction.user.tag}`);

    } catch (error) {
        console.error('Error creating ticket:', error);
        await interaction.editReply({
            content: '❌ Failed to create ticket. Please try again or contact an administrator.',
        });
    }
}

// ============================================================================
// TICKET ACTIONS
// ============================================================================

export async function claimTicket(interaction: any): Promise<void> {
    const ticket = await getTicketFromChannel(interaction.channel.id);
    
    if (!ticket) {
        await interaction.reply({
            content: '❌ This is not a ticket channel.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (!await isStaff(interaction.guild.id, interaction.user.id)) {
        await interaction.reply({
            content: '❌ Only staff members can claim tickets.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await interaction.deferReply();

    // Update database
    await db.update(supportTickets)
        .set({
            claimedById: null, // We'd need user mapping here
            claimedAt: new Date(),
            status: 'in_progress' as const,
            updatedAt: new Date(),
        })
        .where(eq(supportTickets.id, ticket.id));

    // Update channel permissions - hide from other staff, show to claimer
    const settings = await getDiscordTicketSettings();
    if (settings.staffRoleId) {
        await interaction.channel.permissionOverwrites.edit(
            settings.staffRoleId,
            { ViewChannel: false },
            { reason: `Ticket claimed by ${interaction.user.tag}` }
        );
    }
    await interaction.channel.permissionOverwrites.edit(
        interaction.user.id,
        { ViewChannel: true, SendMessages: true, ReadMessageHistory: true },
        { reason: `Ticket claimed by ${interaction.user.tag}` }
    );

    // Add system message
    await db.insert(ticketMessages).values({
        ticketId: ticket.id,
        discordUserId: interaction.user.id,
        discordUsername: interaction.user.username,
        message: `Ticket claimed by ${interaction.user.username}`,
        isStaffReply: true,
        isSystemMessage: true,
    });

    await interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x00FFFF)
                .setDescription(`✅ ${interaction.user} has claimed this ticket.`),
        ],
    });

    await logTicketEvent('claim', ticket.id, interaction.user.id, `Claimed by ${interaction.user.tag}`);
}

export async function releaseTicket(interaction: any): Promise<void> {
    const ticket = await getTicketFromChannel(interaction.channel.id);
    
    if (!ticket) {
        await interaction.reply({
            content: '❌ This is not a ticket channel.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (!await isStaff(interaction.guild.id, interaction.user.id)) {
        await interaction.reply({
            content: '❌ Only staff members can release tickets.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await interaction.deferReply();

    // Update database
    await db.update(supportTickets)
        .set({
            claimedById: null,
            claimedAt: null,
            status: 'open' as const,
            updatedAt: new Date(),
        })
        .where(eq(supportTickets.id, ticket.id));

    // Restore channel permissions
    const settings = await getDiscordTicketSettings();
    if (settings.staffRoleId) {
        await interaction.channel.permissionOverwrites.edit(
            settings.staffRoleId,
            { ViewChannel: true },
            { reason: `Ticket released by ${interaction.user.tag}` }
        );
    }

    await interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x00FFFF)
                .setDescription(`✅ ${interaction.user} has released this ticket.`),
        ],
    });

    await logTicketEvent('release', ticket.id, interaction.user.id, `Released by ${interaction.user.tag}`);
}

export async function closeTicket(interaction: any, reason?: string): Promise<void> {
    const ticket = await getTicketFromChannel(interaction.channel.id);
    
    if (!ticket) {
        await interaction.reply({
            content: '❌ This is not a ticket channel.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const isUserStaff = await isStaff(interaction.guild.id, interaction.user.id);
    const isTicketOwner = ticket.discordUserId === interaction.user.id;

    if (!isUserStaff && !isTicketOwner) {
        await interaction.reply({
            content: '❌ You cannot close this ticket.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // If ticket owner is closing, ask for feedback
    if (isTicketOwner && !isUserStaff) {
        const modal = new ModalBuilder()
            .setCustomId(JSON.stringify({ action: 'feedback', ticketId: ticket.id, reason }))
            .setTitle('Ticket Feedback')
            .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId('rating')
                        .setLabel('Rating (1-5)')
                        .setPlaceholder('Enter a number from 1 to 5')
                        .setStyle(TextInputStyle.Short)
                        .setMaxLength(1)
                        .setRequired(false)
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId('comment')
                        .setLabel('Comments (optional)')
                        .setPlaceholder('Any feedback about your support experience?')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(false)
                )
            );

        await interaction.showModal(modal);
        return;
    }

    // Staff closing or after feedback
    await finallyCloseTicket(interaction, ticket.id, reason);
}

async function finallyCloseTicket(interaction: any, ticketId: number, reason?: string): Promise<void> {
    await interaction.deferReply();

    // Update database
    await db.update(supportTickets)
        .set({
            status: 'closed' as const,
            closedAt: new Date(),
            closedReason: reason || null,
            updatedAt: new Date(),
        })
        .where(eq(supportTickets.id, ticketId));

    // Add system message
    await db.insert(ticketMessages).values({
        ticketId,
        discordUserId: interaction.user.id,
        discordUsername: interaction.user.username,
        message: `Ticket closed by ${interaction.user.username}${reason ? `. Reason: ${reason}` : ''}`,
        isStaffReply: true,
        isSystemMessage: true,
    });

    await interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('🔒 Ticket Closed')
                .setDescription(`This ticket has been closed by ${interaction.user}.`)
                .addFields(
                    reason ? { name: 'Reason', value: reason } : { name: '\u200B', value: '\u200B' }
                )
                .setTimestamp(),
        ],
    });

    // Wait 5 seconds then delete channel
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    try {
        await interaction.channel.delete(`Ticket closed by ${interaction.user.tag}`);
    } catch (error) {
        console.error('Failed to delete ticket channel:', error);
    }

    await logTicketEvent('close', ticketId, interaction.user.id, reason || 'Ticket closed');
}

export async function addMemberToTicket(interaction: any, member: any): Promise<void> {
    const ticket = await getTicketFromChannel(interaction.channel.id);
    
    if (!ticket) {
        await interaction.reply({
            content: '❌ This is not a ticket channel.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await interaction.deferReply();

    await interaction.channel.permissionOverwrites.edit(
        member.id,
        {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            AttachFiles: true,
            EmbedLinks: true,
        },
        { reason: `Added by ${interaction.user.tag}` }
    );

    await interaction.channel.send({
        embeds: [
            new EmbedBuilder()
                .setColor(0x00FF00)
                .setDescription(`✅ ${member} has been added to this ticket by ${interaction.user}.`),
        ],
    });

    await interaction.editReply({
        content: `✅ Added ${member} to the ticket.`,
    });

    await logTicketEvent('add_member', ticket.id, interaction.user.id, `Added ${member.user.tag}`);
}

export async function removeMemberFromTicket(interaction: any, member: any): Promise<void> {
    const ticket = await getTicketFromChannel(interaction.channel.id);
    
    if (!ticket) {
        await interaction.reply({
            content: '❌ This is not a ticket channel.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // Can't remove ticket owner or bot
    if (member.id === ticket.discordUserId || member.id === interaction.client.user.id) {
        await interaction.reply({
            content: '❌ Cannot remove this member from the ticket.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await interaction.deferReply();

    await interaction.channel.permissionOverwrites.delete(
        member.id,
        `Removed by ${interaction.user.tag}`
    );

    await interaction.channel.send({
        embeds: [
            new EmbedBuilder()
                .setColor(0xFF6600)
                .setDescription(`🚪 ${member} has been removed from this ticket by ${interaction.user}.`),
        ],
    });

    await interaction.editReply({
        content: `✅ Removed ${member} from the ticket.`,
    });

    await logTicketEvent('remove_member', ticket.id, interaction.user.id, `Removed ${member.user.tag}`);
}

export async function transferTicket(interaction: any, newOwner: any): Promise<void> {
    const ticket = await getTicketFromChannel(interaction.channel.id);
    
    if (!ticket) {
        await interaction.reply({
            content: '❌ This is not a ticket channel.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await interaction.deferReply();

    const oldOwnerId = ticket.discordUserId;

    // Update database
    await db.update(supportTickets)
        .set({
            discordUserId: newOwner.id,
            discordUsername: newOwner.user.username,
            updatedAt: new Date(),
        })
        .where(eq(supportTickets.id, ticket.id));

    // Update permissions
    await interaction.channel.permissionOverwrites.edit(
        newOwner.id,
        {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            AttachFiles: true,
            EmbedLinks: true,
        },
        { reason: `Ticket transferred to ${newOwner.user.tag}` }
    );

    // Update channel name and topic
    const newChannelName = `ticket-${ticket.id}-${newOwner.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
    await interaction.channel.edit({
        name: newChannelName,
        topic: `Ticket #${ticket.id} | ${newOwner.user.tag}`,
    });

    await interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x00FFFF)
                .setDescription(`✅ Ticket ownership transferred from <@${oldOwnerId}> to ${newOwner}.`),
        ],
    });

    await logTicketEvent('transfer', ticket.id, interaction.user.id, `Transferred to ${newOwner.user.tag}`);
}

export async function setTicketPriority(interaction: any, priority: string): Promise<void> {
    const ticket = await getTicketFromChannel(interaction.channel.id);
    
    if (!ticket) {
        await interaction.reply({
            content: '❌ This is not a ticket channel.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (!await isStaff(interaction.guild.id, interaction.user.id)) {
        await interaction.reply({
            content: '❌ Only staff members can change ticket priority.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await interaction.deferReply();

    // Update database
    await db.update(supportTickets)
        .set({
            priority: priority as 'low' | 'normal' | 'high' | 'urgent',
            updatedAt: new Date(),
        })
        .where(eq(supportTickets.id, ticket.id));

    // Update channel name with priority emoji
    const emoji = getPriorityEmoji(priority);
    let channelName = interaction.channel.name;
    // Remove old priority emoji if present
    channelName = channelName.replace(/^[🔴🟠🔵🟢]/, '');
    channelName = emoji + channelName;
    
    await interaction.channel.setName(channelName);

    await interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x00FFFF)
                .setDescription(`✅ Ticket priority set to ${emoji} **${priority.charAt(0).toUpperCase() + priority.slice(1)}** by ${interaction.user}.`),
        ],
    });

    await logTicketEvent('priority', ticket.id, interaction.user.id, `Priority changed to ${priority}`);
}

export async function listTickets(interaction: any): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const tickets = await db
        .select()
        .from(supportTickets)
        .where(
            and(
                eq(supportTickets.discordUserId, interaction.user.id),
                eq(supportTickets.status, 'open')
            )
        )
        .orderBy(desc(supportTickets.createdAt))
        .limit(10);

    if (tickets.length === 0) {
        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x00FFFF)
                    .setTitle('📋 Your Tickets')
                    .setDescription('You have no open tickets.'),
            ],
        });
        return;
    }

    const ticketList = tickets.map(t => 
        `${getStatusEmoji(t.status)} **#${t.id}** - ${t.subject}\n` +
        `   ${getPriorityEmoji(t.priority)} ${t.priority} | <t:${Math.floor(new Date(t.createdAt).getTime() / 1000)}:R>`
    ).join('\n\n');

    await interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setColor(0x00FFFF)
                .setTitle('📋 Your Open Tickets')
                .setDescription(ticketList)
                .setFooter({ text: `${tickets.length} ticket(s)` }),
        ],
    });
}

export async function getTranscript(interaction: any, ticketId?: string): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let ticket;
    if (ticketId) {
        [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, parseInt(ticketId)));
    } else {
        ticket = await getTicketFromChannel(interaction.channel.id);
    }

    if (!ticket) {
        await interaction.editReply({
            content: '❌ Ticket not found.',
        });
        return;
    }

    // Check permission
    const isUserStaff = await isStaff(interaction.guild.id, interaction.user.id);
    if (!isUserStaff && ticket.discordUserId !== interaction.user.id) {
        await interaction.editReply({
            content: '❌ You do not have permission to view this transcript.',
        });
        return;
    }

    const messages = await db
        .select()
        .from(ticketMessages)
        .where(eq(ticketMessages.ticketId, ticket.id))
        .orderBy(asc(ticketMessages.createdAt));

    if (messages.length === 0) {
        await interaction.editReply({
            content: '❌ No messages found for this ticket.',
        });
        return;
    }

    // Build transcript
    let transcript = `# Ticket #${ticket.id} Transcript\n`;
    transcript += `**Subject:** ${ticket.subject}\n`;
    transcript += `**Status:** ${ticket.status}\n`;
    transcript += `**Priority:** ${ticket.priority}\n`;
    transcript += `**Created:** ${new Date(ticket.createdAt).toISOString()}\n`;
    transcript += `---\n\n`;

    for (const msg of messages) {
        const author = msg.discordUsername || msg.guestName || 'Unknown';
        const timestamp = new Date(msg.createdAt).toISOString();
        const role = msg.isStaffReply ? '[STAFF]' : msg.isSystemMessage ? '[SYSTEM]' : '';
        transcript += `**${author}** ${role} - ${timestamp}\n${msg.message}\n\n`;
    }

    // Send as file attachment
    const buffer = Buffer.from(transcript, 'utf-8');
    
    await interaction.editReply({
        content: `📜 Transcript for Ticket #${ticket.id}`,
        files: [{
            attachment: buffer,
            name: `ticket-${ticket.id}-transcript.md`,
        }],
    });
}

// ============================================================================
// MOVE, RENAME, TOPIC, TAG, FORCE-CLOSE, HELP
// ============================================================================

async function moveTicket(interaction: any, categoryId: number): Promise<void> {
    const ticket = await getTicketFromChannel(interaction.channel.id);
    if (!ticket) {
        await interaction.reply({ content: '❌ This is not a ticket channel.', flags: MessageFlags.Ephemeral });
        return;
    }

    if (!await isStaff(interaction.guild.id, interaction.user.id)) {
        await interaction.reply({ content: '❌ Only staff can move tickets.', flags: MessageFlags.Ephemeral });
        return;
    }

    const [newCategory] = await db.select().from(ticketCategories).where(eq(ticketCategories.id, categoryId));
    if (!newCategory) {
        await interaction.reply({ content: '❌ Category not found.', flags: MessageFlags.Ephemeral });
        return;
    }

    await interaction.deferReply();

    const oldCategoryId = ticket.categoryId;
    await db.update(supportTickets).set({ categoryId, updatedAt: new Date() }).where(eq(supportTickets.id, ticket.id));

    // Move channel to new Discord category if configured
    if (newCategory.discordCategoryId) {
        await interaction.channel.setParent(newCategory.discordCategoryId, { lockPermissions: false }).catch(() => {});
    }

    const [oldCategory] = oldCategoryId ? await db.select().from(ticketCategories).where(eq(ticketCategories.id, oldCategoryId)) : [{ name: 'Unknown' }];

    await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0x00FFFF).setDescription(`✅ Ticket moved from **${oldCategory?.name}** to **${newCategory.name}**`)],
    });

    await logTicketEvent('move', ticket.id, interaction.user.id, `Moved to ${newCategory.name}`);
}

async function renameTicket(interaction: any, name: string): Promise<void> {
    const ticket = await getTicketFromChannel(interaction.channel.id);
    if (!ticket) {
        await interaction.reply({ content: '❌ This is not a ticket channel.', flags: MessageFlags.Ephemeral });
        return;
    }

    if (name.length < 1 || name.length > 100) {
        await interaction.reply({ content: '❌ Name must be 1-100 characters.', flags: MessageFlags.Ephemeral });
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const oldName = interaction.channel.name;
    const newName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    await interaction.channel.setName(newName);

    await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0x00FF00).setTitle('✅ Channel Renamed').setDescription(`Renamed to **${newName}**`)],
    });

    await logTicketEvent('rename', ticket.id, interaction.user.id, `${oldName} → ${newName}`);
}

async function changeTicketTopic(interaction: any): Promise<void> {
    const ticket = await getTicketFromChannel(interaction.channel.id);
    if (!ticket) {
        await interaction.reply({ content: '❌ This is not a ticket channel.', flags: MessageFlags.Ephemeral });
        return;
    }

    const modal = new ModalBuilder()
        .setCustomId(JSON.stringify({ action: 'edit_topic', ticketId: ticket.id }))
        .setTitle('Change Topic')
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId('topic')
                    .setLabel('Topic')
                    .setPlaceholder('Describe your issue...')
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(ticket.topic || '')
                    .setRequired(true)
                    .setMaxLength(1000)
            )
        );

    await interaction.showModal(modal);
}

async function useTag(interaction: any, tagId: number, forUser?: any): Promise<void> {
    const [tag] = await db.select().from(ticketTags).where(eq(ticketTags.id, tagId));
    if (!tag) {
        await interaction.reply({ content: '❌ Tag not found.', flags: MessageFlags.Ephemeral });
        return;
    }

    await interaction.deferReply({ flags: forUser ? 0 : MessageFlags.Ephemeral });

    // Increment usage count
    await db.update(ticketTags).set({ usageCount: (tag.usageCount || 0) + 1 }).where(eq(ticketTags.id, tagId));

    await interaction.editReply({
        content: forUser?.toString() || undefined,
        allowedMentions: forUser ? { users: [forUser.id] } : undefined,
        embeds: [new EmbedBuilder().setColor(0x00FFFF).setDescription(tag.content)],
    });
}

async function forceCloseTickets(interaction: any): Promise<void> {
    if (!await isStaff(interaction.guild.id, interaction.user.id)) {
        await interaction.reply({ content: '❌ Only staff can force close tickets.', flags: MessageFlags.Ephemeral });
        return;
    }

    const ticketIdStr = interaction.options.getString('ticket');
    const timeStr = interaction.options.getString('time');
    const reason = interaction.options.getString('reason') || 'Force closed by staff';

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Close specific ticket
    if (ticketIdStr) {
        const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, parseInt(ticketIdStr)));
        if (!ticket) {
            await interaction.editReply({ content: '❌ Ticket not found.' });
            return;
        }

        await db.update(supportTickets).set({
            status: 'closed' as const,
            closedAt: new Date(),
            closedByDiscordId: interaction.user.id,
            closedReason: reason,
            updatedAt: new Date(),
        }).where(eq(supportTickets.id, ticket.id));

        // Delete channel if exists
        if (ticket.discordChannelId && discordClient) {
            try {
                const channel = await discordClient.channels.fetch(ticket.discordChannelId);
                if (channel) await (channel as TextChannel).delete('Force closed');
            } catch {}
        }

        await interaction.editReply({ content: `✅ Ticket #${ticket.number} force closed.` });
        await logTicketEvent('force_close', ticket.id, interaction.user.id, reason);
        return;
    }

    // Close inactive tickets by time
    if (timeStr) {
        const timeMatch = timeStr.match(/^(\d+)([hdwm])$/i);
        if (!timeMatch) {
            await interaction.editReply({ content: '❌ Invalid time format. Use: 24h, 7d, 2w, 1m' });
            return;
        }

        const num = parseInt(timeMatch[1]);
        const unit = timeMatch[2].toLowerCase();
        const multipliers: Record<string, number> = { h: 3600000, d: 86400000, w: 604800000, m: 2592000000 };
        const cutoff = new Date(Date.now() - num * multipliers[unit]);

        const tickets = await db.select().from(supportTickets).where(
            and(eq(supportTickets.status, 'open'), lt(supportTickets.lastMessageAt, cutoff))
        );

        if (tickets.length === 0) {
            await interaction.editReply({ content: `❌ No tickets inactive for ${timeStr} found.` });
            return;
        }

        for (const ticket of tickets) {
            await db.update(supportTickets).set({
                status: 'closed' as const,
                closedAt: new Date(),
                closedByDiscordId: interaction.user.id,
                closedReason: reason,
                updatedAt: new Date(),
            }).where(eq(supportTickets.id, ticket.id));

            if (ticket.discordChannelId && discordClient) {
                try {
                    const channel = await discordClient.channels.fetch(ticket.discordChannelId);
                    if (channel) await (channel as TextChannel).delete('Force closed - inactive');
                } catch {}
            }
        }

        await interaction.editReply({ content: `✅ Force closed ${tickets.length} inactive ticket(s).` });
        return;
    }

    // Close current channel's ticket
    const ticket = await getTicketFromChannel(interaction.channel.id);
    if (!ticket) {
        await interaction.editReply({ content: '❌ Use in a ticket channel or specify a ticket/time.' });
        return;
    }

    await db.update(supportTickets).set({
        status: 'closed' as const,
        closedAt: new Date(),
        closedByDiscordId: interaction.user.id,
        closedReason: reason,
        updatedAt: new Date(),
    }).where(eq(supportTickets.id, ticket.id));

    await interaction.editReply({ content: '✅ Ticket force closed. Channel will be deleted.' });
    await logTicketEvent('force_close', ticket.id, interaction.user.id, reason);

    setTimeout(async () => {
        try { await interaction.channel.delete('Force closed'); } catch {}
    }, 3000);
}

async function showHelp(interaction: any): Promise<void> {
    const isUserStaff = await isStaff(interaction.guild.id, interaction.user.id);

    const userCommands = `
**User Commands:**
\`/new [topic]\` - Create a new ticket
\`/close [reason]\` - Close your ticket
\`/tickets\` - List your open tickets
\`/transcript [ticket_id]\` - Get ticket transcript
`;

    const staffCommands = `
**Staff Commands:**
\`/claim\` - Claim a ticket
\`/release\` - Release a claimed ticket
\`/add <member>\` - Add member to ticket
\`/remove <member>\` - Remove member from ticket
\`/transfer <member>\` - Transfer ownership
\`/priority <level>\` - Set priority
\`/move <category>\` - Move to category
\`/rename <name>\` - Rename channel
\`/topic\` - Change topic
\`/tag <tag> [for]\` - Use predefined response
\`/force-close [ticket] [time] [reason]\` - Force close tickets
`;

    const adminCommands = `
**Admin Commands:**
\`/panel [channel] [title] [description]\` - Create ticket panel
\`/setup [category] [staff_role]\` - Configure ticket system
`;

    const embed = new EmbedBuilder()
        .setColor(0x00FFFF)
        .setTitle('🎫 Ticket Commands')
        .setDescription(userCommands + (isUserStaff ? staffCommands + adminCommands : ''))
        .setFooter({ text: 'Vonix Network Support' });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

// ============================================================================
// TICKET PANEL
// ============================================================================

export async function createTicketPanel(
    interaction: any,
    channel?: any,
    title?: string,
    description?: string
): Promise<void> {
    const targetChannel = channel || interaction.channel;

    // Get categories
    const categories = await db
        .select()
        .from(ticketCategories)
        .where(eq(ticketCategories.enabled, true))
        .orderBy(asc(ticketCategories.order));

    const embed = new EmbedBuilder()
        .setColor(0x00FFFF)
        .setTitle(title || '🎫 Support Tickets')
        .setDescription(
            description || 
            'Need help? Click the button below to create a support ticket.\n\n' +
            'Our support team will assist you as soon as possible.'
        )
        .setFooter({ text: 'Vonix Network Support' })
        .setTimestamp();

    if (categories.length > 0) {
        const categoryList = categories.map(c => 
            `${c.emoji || '🎫'} **${c.name}**${c.description ? ` - ${c.description}` : ''}`
        ).join('\n');
        embed.addFields({ name: 'Categories', value: categoryList });
    }

    const components: ActionRowBuilder<any>[] = [];

    // Add category selector if multiple categories
    if (categories.length > 1) {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_category_select')
            .setPlaceholder('Select a category...')
            .addOptions(
                categories.map(c => ({
                    label: c.name,
                    description: c.description?.substring(0, 100) || 'Create a ticket',
                    value: c.id.toString(),
                    emoji: c.emoji || '🎫',
                }))
            );
        components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu));
    }

    // Add create button
    const createButton = new ButtonBuilder()
        .setCustomId('ticket_create')
        .setLabel('Create Ticket')
        .setEmoji('🎫')
        .setStyle(ButtonStyle.Primary);

    components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(createButton));

    await targetChannel.send({
        embeds: [embed],
        components,
    });

    await interaction.reply({
        content: `✅ Ticket panel created in ${targetChannel}!`,
        flags: MessageFlags.Ephemeral,
    });
}

// ============================================================================
// LOGGING
// ============================================================================

async function logTicketEvent(
    action: string,
    ticketId: number,
    userId: string,
    details: string
): Promise<void> {
    const settings = await getDiscordTicketSettings();
    if (!settings.logChannelId || !discordClient) return;

    try {
        const logChannel = await discordClient.channels.fetch(settings.logChannelId) as TextChannel;
        if (!logChannel) return;

        const colors: Record<string, number> = {
            create: 0x00FF00,
            close: 0xFF0000,
            claim: 0x00FFFF,
            release: 0xFFFF00,
            transfer: 0xFF00FF,
            priority: 0xFFA500,
            add_member: 0x00FF00,
            remove_member: 0xFF6600,
        };

        await logChannel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(colors[action] || 0x808080)
                    .setTitle(`📋 Ticket ${action.charAt(0).toUpperCase() + action.slice(1)}`)
                    .addFields(
                        { name: 'Ticket', value: `#${ticketId}`, inline: true },
                        { name: 'User', value: `<@${userId}>`, inline: true },
                        { name: 'Details', value: details },
                    )
                    .setTimestamp(),
            ],
        });
    } catch (error) {
        console.error('Failed to log ticket event:', error);
    }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

export async function setupTicketEventHandlers(): Promise<void> {
    const client = await getDiscordClient();
    if (!client) return;

    client.on('interactionCreate', async (interaction: any) => {
        try {
            // Slash commands
            if (interaction.isChatInputCommand()) {
                switch (interaction.commandName) {
                    case 'new':
                        await createTicket(interaction, interaction.options.getString('topic'));
                        break;
                    case 'close':
                        await closeTicket(interaction, interaction.options.getString('reason'));
                        break;
                    case 'claim':
                        await claimTicket(interaction);
                        break;
                    case 'release':
                        await releaseTicket(interaction);
                        break;
                    case 'add':
                        await addMemberToTicket(interaction, interaction.options.getMember('member'));
                        break;
                    case 'remove':
                        await removeMemberFromTicket(interaction, interaction.options.getMember('member'));
                        break;
                    case 'transfer':
                        await transferTicket(interaction, interaction.options.getMember('member'));
                        break;
                    case 'priority':
                        await setTicketPriority(interaction, interaction.options.getString('level'));
                        break;
                    case 'tickets':
                        await listTickets(interaction);
                        break;
                    case 'transcript':
                        await getTranscript(interaction, interaction.options.getString('ticket_id'));
                        break;
                    case 'panel':
                        await createTicketPanel(
                            interaction,
                            interaction.options.getChannel('channel'),
                            interaction.options.getString('title'),
                            interaction.options.getString('description')
                        );
                        break;
                    case 'setup':
                        // Handle setup command
                        const category = interaction.options.getChannel('category');
                        const staffRole = interaction.options.getRole('staff_role');
                        
                        if (category) {
                            await db.insert(siteSettings).values({
                                key: 'discord_ticket_category_id',
                                value: category.id,
                                category: 'discord',
                                description: 'Discord category for ticket channels',
                                isPublic: false,
                            }).onConflictDoUpdate({
                                target: siteSettings.key,
                                set: { value: category.id, updatedAt: new Date() },
                            });
                        }
                        
                        if (staffRole) {
                            await db.insert(siteSettings).values({
                                key: 'discord_ticket_staff_role_id',
                                value: staffRole.id,
                                category: 'discord',
                                description: 'Discord staff role for tickets',
                                isPublic: false,
                            }).onConflictDoUpdate({
                                target: siteSettings.key,
                                set: { value: staffRole.id, updatedAt: new Date() },
                            });
                        }
                        
                        await interaction.reply({
                            content: '✅ Ticket system configured!' +
                                (category ? `\n📁 Category: ${category}` : '') +
                                (staffRole ? `\n👥 Staff Role: ${staffRole}` : ''),
                            flags: MessageFlags.Ephemeral,
                        });
                        break;
                    case 'move':
                        await moveTicket(interaction, interaction.options.getInteger('category'));
                        break;
                    case 'rename':
                        await renameTicket(interaction, interaction.options.getString('name'));
                        break;
                    case 'topic':
                        await changeTicketTopic(interaction);
                        break;
                    case 'tag':
                        await useTag(interaction, interaction.options.getInteger('tag'), interaction.options.getUser('for'));
                        break;
                    case 'force-close':
                        await forceCloseTickets(interaction);
                        break;
                    case 'help':
                        await showHelp(interaction);
                        break;
                }
                return;
            }

            // Autocomplete interactions
            if (interaction.isAutocomplete()) {
                const focused = interaction.options.getFocused(true);
                if (focused.name === 'category') {
                    const categories = await db.select().from(ticketCategories).where(eq(ticketCategories.enabled, true));
                    await interaction.respond(categories.map(c => ({ name: c.name, value: c.id })));
                } else if (focused.name === 'tag') {
                    const tags = await db.select().from(ticketTags).where(eq(ticketTags.enabled, true));
                    await interaction.respond(tags.map(t => ({ name: t.name, value: t.id })));
                } else if (focused.name === 'ticket') {
                    const tickets = await db.select().from(supportTickets).where(eq(supportTickets.status, 'open')).limit(25);
                    await interaction.respond(tickets.map(t => ({ name: `#${t.number} - ${t.subject.substring(0, 50)}`, value: t.id.toString() })));
                }
                return;
            }

            // Button interactions
            if (interaction.isButton()) {
                const customId = interaction.customId;
                
                // Handle ticket_create button
                if (customId === 'ticket_create') {
                    // Show topic modal
                    const modal = new ModalBuilder()
                        .setCustomId('ticket_create_modal')
                        .setTitle('Create Support Ticket')
                        .addComponents(
                            new ActionRowBuilder<TextInputBuilder>().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('topic')
                                    .setLabel('What do you need help with?')
                                    .setPlaceholder('Briefly describe your issue...')
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setRequired(true)
                                    .setMaxLength(1000)
                            )
                        );
                    await interaction.showModal(modal);
                    return;
                }

                // Handle JSON customId buttons
                try {
                    const data = JSON.parse(customId);
                    
                    if (data.action === 'claim') {
                        await claimTicket(interaction);
                    } else if (data.action === 'close') {
                        await closeTicket(interaction);
                    } else if (data.action === 'unclaim') {
                        await releaseTicket(interaction);
                    }
                } catch {
                    // Not a JSON customId
                }
                return;
            }

            // Select menu interactions
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId === 'ticket_category_select') {
                    const categoryId = parseInt(interaction.values[0]);
                    
                    // Show topic modal with category
                    const modal = new ModalBuilder()
                        .setCustomId(JSON.stringify({ action: 'create_with_category', categoryId }))
                        .setTitle('Create Support Ticket')
                        .addComponents(
                            new ActionRowBuilder<TextInputBuilder>().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('topic')
                                    .setLabel('What do you need help with?')
                                    .setPlaceholder('Briefly describe your issue...')
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setRequired(true)
                                    .setMaxLength(1000)
                            )
                        );
                    await interaction.showModal(modal);
                }
                return;
            }

            // Modal submissions
            if (interaction.isModalSubmit()) {
                const customId = interaction.customId;
                
                if (customId === 'ticket_create_modal') {
                    const topic = interaction.fields.getTextInputValue('topic');
                    await createTicket(interaction, topic);
                    return;
                }

                try {
                    const data = JSON.parse(customId);
                    
                    if (data.action === 'create_with_category') {
                        const topic = interaction.fields.getTextInputValue('topic');
                        await createTicket(interaction, topic, data.categoryId);
                    } else if (data.action === 'feedback') {
                        // Handle feedback submission then close
                        const rating = parseInt(interaction.fields.getTextInputValue('rating')) || 0;
                        const comment = interaction.fields.getTextInputValue('comment');
                        
                        // Store feedback
                        if (rating >= 1 && rating <= 5) {
                            await db.insert(ticketFeedback).values({
                                ticketId: data.ticketId,
                                rating: Math.min(Math.max(rating, 1), 5),
                                comment: comment || null,
                                discordUserId: interaction.user.id,
                            });
                        }
                        
                        await finallyCloseTicket(interaction, data.ticketId, data.reason);
                    } else if (data.action === 'edit_topic') {
                        // Handle topic edit
                        const newTopic = interaction.fields.getTextInputValue('topic');
                        await db.update(supportTickets)
                            .set({ topic: newTopic, subject: newTopic, updatedAt: new Date() })
                            .where(eq(supportTickets.id, data.ticketId));
                        
                        // Update channel topic
                        const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, data.ticketId));
                        if (ticket?.discordChannelId) {
                            await interaction.channel.setTopic(`<@${ticket.discordUserId}> | ${newTopic}`).catch(() => {});
                        }
                        
                        await interaction.reply({
                            embeds: [new EmbedBuilder().setColor(0x00FF00).setDescription('✅ Topic updated.')],
                            flags: MessageFlags.Ephemeral,
                        });
                    }
                } catch {
                    // Not a JSON customId
                }
                return;
            }
        } catch (error) {
            console.error('Error handling interaction:', error);
            try {
                const errorMsg = '❌ An error occurred. Please try again.';
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errorMsg });
                } else {
                    await interaction.reply({ content: errorMsg, flags: MessageFlags.Ephemeral });
                }
            } catch {}
        }
    });

    // Message sync for ticket channels
    client.on('messageCreate', async (message: any) => {
        if (message.author.bot) return;
        if (!message.guild) return;

        const ticket = await getTicketFromChannel(message.channel.id);
        if (!ticket) return;

        const isUserStaff = await isStaff(message.guild.id, message.author.id);

        // Save message to database
        await db.insert(ticketMessages).values({
            ticketId: ticket.id,
            discordUserId: message.author.id,
            discordUsername: message.author.username,
            message: message.content,
            isStaffReply: isUserStaff,
        });

        // Update ticket
        const updateData: any = { updatedAt: new Date() };
        
        if (isUserStaff && !ticket.firstResponseAt) {
            updateData.firstResponseAt = new Date();
        }
        
        if (isUserStaff && ticket.status === 'open') {
            updateData.status = 'waiting';
        } else if (!isUserStaff && ticket.status === 'waiting') {
            updateData.status = 'open';
        }

        await db.update(supportTickets)
            .set(updateData)
            .where(eq(supportTickets.id, ticket.id));
    });

    console.log('✅ Discord ticket event handlers setup');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export async function initializeDiscordTickets(): Promise<void> {
    try {
        const client = await getDiscordClient();
        if (!client) {
            console.log('Discord tickets: Bot token not configured');
            return;
        }

        await registerTicketCommands();
        await setupTicketEventHandlers();

        console.log('✅ Discord tickets system initialized');
    } catch (error) {
        console.error('Failed to initialize Discord tickets:', error);
    }
}
