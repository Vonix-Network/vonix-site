/**
 * MySQL/MariaDB Schema
 * Used for MySQL and MariaDB databases
 */
import { sql } from 'drizzle-orm';
import { mysqlTable, serial, varchar, text, int, boolean, timestamp, double, mysqlEnum } from 'drizzle-orm/mysql-core';

// ===================================
// USERS & AUTHENTICATION
// ===================================

export const users = mysqlTable('users', {
    id: serial('id').primaryKey(),
    username: varchar('username', { length: 255 }).notNull().unique(),
    email: varchar('email', { length: 255 }),
    password: text('password').notNull(),
    role: mysqlEnum('role', ['user', 'moderator', 'admin', 'superadmin']).default('user').notNull(),
    minecraftUsername: varchar('minecraft_username', { length: 255 }).unique(),
    minecraftUuid: varchar('minecraft_uuid', { length: 36 }).unique(),
    avatar: text('avatar'),
    bio: text('bio'),
    preferredBackground: text('preferred_background'),

    // Avatar/Skin Viewer Settings
    avatarAnimation: varchar('avatar_animation', { length: 50 }).default('walking'),
    avatarAutoRotate: boolean('avatar_auto_rotate').default(true),
    avatarRotateSpeed: double('avatar_rotate_speed').default(0.5),
    avatarZoom: double('avatar_zoom').default(0.9),
    avatarAnimationSpeed: double('avatar_animation_speed').default(1),
    avatarShowNameTag: boolean('avatar_show_name_tag').default(false),

    // Discord Integration
    discordId: varchar('discord_id', { length: 255 }).unique(),
    discordUsername: varchar('discord_username', { length: 255 }),
    discordAvatar: text('discord_avatar'),

    // Donation & Rank System
    donationRankId: varchar('donation_rank_id', { length: 255 }),
    rankExpiresAt: timestamp('rank_expires_at'),
    rankPaused: boolean('rank_paused').default(false),
    pausedRankId: varchar('paused_rank_id', { length: 255 }),
    pausedRemainingDays: int('paused_remaining_days'),
    pausedAt: timestamp('paused_at'),
    totalDonated: double('total_donated').default(0),

    // Payment Integration - Stripe
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).unique(),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }).unique(),
    subscriptionStatus: mysqlEnum('subscription_status', ['active', 'canceled', 'past_due', 'paused', 'trialing']),

    // Payment Integration - Square
    squareCustomerId: varchar('square_customer_id', { length: 255 }).unique(),
    squareSubscriptionId: varchar('square_subscription_id', { length: 255 }).unique(),
    squareCardId: varchar('square_card_id', { length: 255 }),

    donorRank: varchar('donor_rank', { length: 255 }),

    // XP & Leveling
    xp: int('xp').default(0).notNull(),
    websiteXp: int('website_xp').default(0).notNull(),
    minecraftXp: int('minecraft_xp').default(0).notNull(),
    level: int('level').default(1).notNull(),
    title: varchar('title', { length: 255 }),

    // Security
    emailVerified: boolean('email_verified').default(false),
    twoFactorEnabled: boolean('two_factor_enabled').default(false),
    twoFactorSecret: text('two_factor_secret'),
    lastLoginAt: timestamp('last_login_at'),
    lastLoginIp: varchar('last_login_ip', { length: 45 }),
    failedLoginAttempts: int('failed_login_attempts').default(0),
    lockedUntil: timestamp('locked_until'),

    // Presence tracking
    lastSeenAt: timestamp('last_seen_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ===================================
// SESSIONS & SECURITY
// ===================================

export const sessions = mysqlTable('sessions', {
    id: varchar('id', { length: 255 }).primaryKey(),
    userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at').notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = mysqlTable('audit_logs', {
    id: serial('id').primaryKey(),
    userId: int('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 255 }).notNull(),
    resource: varchar('resource', { length: 255 }).notNull(),
    resourceId: varchar('resource_id', { length: 255 }),
    details: text('details'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const passwordResetTokens = mysqlTable('password_reset_tokens', {
    id: serial('id').primaryKey(),
    userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================================
// REGISTRATION & VERIFICATION
// ===================================

export const registrationCodes = mysqlTable('registration_codes', {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 255 }).notNull().unique(),
    minecraftUsername: varchar('minecraft_username', { length: 255 }).notNull(),
    minecraftUuid: varchar('minecraft_uuid', { length: 36 }).notNull(),
    used: boolean('used').default(false).notNull(),
    userId: int('user_id').references(() => users.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    usedAt: timestamp('used_at'),
});

// ===================================
// SERVERS
// ===================================

export const servers = mysqlTable('servers', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    ipAddress: varchar('ip_address', { length: 255 }).notNull(),
    port: int('port').default(25565).notNull(),
    hidePort: boolean('hide_port').default(false).notNull(),
    gameType: varchar('game_type', { length: 50 }).default('minecraft').notNull(), // 'minecraft' | 'hytale'
    modpackName: varchar('modpack_name', { length: 255 }),
    bluemapUrl: text('bluemap_url'),
    curseforgeUrl: text('curseforge_url'),
    status: varchar('status', { length: 50 }).default('offline').notNull(),
    playersOnline: int('players_online').default(0).notNull(),
    playersMax: int('players_max').default(0).notNull(),
    version: varchar('version', { length: 100 }),
    orderIndex: int('order_index').default(0).notNull(),
    apiKey: text('api_key'),
    pterodactylServerId: varchar('pterodactyl_server_id', { length: 255 }),
    pterodactylPanelUrl: text('pterodactyl_panel_url'),
    // Maintenance mode - disables status checks and shows maintenance badge
    maintenanceMode: boolean('maintenance_mode').default(false).notNull(),
    maintenanceMessage: text('maintenance_message'),
    // Persistent consecutive failure tracking for offline notifications
    consecutiveFailures: int('consecutive_failures').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const serverXp = mysqlTable('server_xp', {
    id: serial('id').primaryKey(),
    userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    serverId: int('server_id').notNull().references(() => servers.id, { onDelete: 'cascade' }),
    xp: int('xp').default(0).notNull(),
    level: int('level').default(0).notNull(),
    playtimeSeconds: int('playtime_seconds').default(0),
    lastSyncedAt: timestamp('last_synced_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================================
// FORUM SYSTEM
// ===================================

export const forumCategories = mysqlTable('forum_categories', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    icon: varchar('icon', { length: 100 }),
    orderIndex: int('order_index').default(0).notNull(),
    createPermission: mysqlEnum('create_permission', ['user', 'moderator', 'admin']).default('user').notNull(),
    replyPermission: mysqlEnum('reply_permission', ['user', 'moderator', 'admin']).default('user').notNull(),
    viewPermission: mysqlEnum('view_permission', ['user', 'moderator', 'admin']).default('user').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const forumPosts = mysqlTable('forum_posts', {
    id: serial('id').primaryKey(),
    categoryId: int('category_id').notNull().references(() => forumCategories.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    authorId: int('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    pinned: boolean('pinned').default(false).notNull(),
    locked: boolean('locked').default(false).notNull(),
    views: int('views').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const forumReplies = mysqlTable('forum_replies', {
    id: serial('id').primaryKey(),
    postId: int('post_id').notNull().references(() => forumPosts.id, { onDelete: 'cascade' }),
    authorId: int('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const forumVotes = mysqlTable('forum_votes', {
    id: serial('id').primaryKey(),
    postId: int('post_id').references(() => forumPosts.id, { onDelete: 'cascade' }),
    replyId: int('reply_id').references(() => forumReplies.id, { onDelete: 'cascade' }),
    userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    voteType: mysqlEnum('vote_type', ['upvote', 'downvote']).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================================
// SOCIAL FEED
// ===================================

export const socialPosts = mysqlTable('social_posts', {
    id: serial('id').primaryKey(),
    userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    imageUrl: text('image_url'),
    likesCount: int('likes_count').default(0).notNull(),
    commentsCount: int('comments_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const socialComments = mysqlTable('social_comments', {
    id: serial('id').primaryKey(),
    postId: int('post_id').notNull().references(() => socialPosts.id, { onDelete: 'cascade' }),
    userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    parentCommentId: int('parent_comment_id'),
    likesCount: int('likes_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const socialLikes = mysqlTable('social_likes', {
    id: serial('id').primaryKey(),
    userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    postId: int('post_id').notNull().references(() => socialPosts.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================================
// FRIENDS & MESSAGING
// ===================================

export const friendships = mysqlTable('friendships', {
    id: serial('id').primaryKey(),
    userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    friendId: int('friend_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    status: mysqlEnum('status', ['pending', 'accepted', 'blocked']).default('pending').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const privateMessages = mysqlTable('private_messages', {
    id: serial('id').primaryKey(),
    senderId: int('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    recipientId: int('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    read: boolean('read').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================================
// DONATIONS & PAYMENTS
// ===================================

export const donations = mysqlTable('donations', {
    id: serial('id').primaryKey(),
    userId: int('user_id').references(() => users.id, { onDelete: 'set null' }),
    minecraftUsername: varchar('minecraft_username', { length: 255 }),
    minecraftUuid: varchar('minecraft_uuid', { length: 36 }),
    amount: double('amount').notNull(),
    currency: varchar('currency', { length: 10 }).default('USD').notNull(),
    method: varchar('method', { length: 100 }),
    message: text('message'),
    displayed: boolean('displayed').default(true).notNull(),
    receiptNumber: varchar('receipt_number', { length: 255 }),
    paymentId: varchar('payment_id', { length: 255 }),
    subscriptionId: varchar('subscription_id', { length: 255 }),
    rankId: varchar('rank_id', { length: 255 }),
    days: int('days'),
    paymentType: mysqlEnum('payment_type', ['one_time', 'subscription', 'subscription_renewal']).default('one_time'),
    status: mysqlEnum('status', ['completed', 'pending', 'failed', 'refunded']).default('completed').notNull(),
    stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }),
    stripeInvoiceUrl: text('stripe_invoice_url'),
    stripePriceId: varchar('stripe_price_id', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const donationRanks = mysqlTable('donation_ranks', {
    id: varchar('id', { length: 255 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    minAmount: double('min_amount').notNull(),
    color: varchar('color', { length: 50 }).notNull(),
    textColor: varchar('text_color', { length: 50 }).notNull(),
    icon: varchar('icon', { length: 100 }),
    badge: varchar('badge', { length: 255 }),
    glow: boolean('glow').default(false).notNull(),
    duration: int('duration').default(30).notNull(),
    subtitle: varchar('subtitle', { length: 255 }),
    perks: text('perks'),
    stripeProductId: varchar('stripe_product_id', { length: 255 }),
    stripePriceMonthly: varchar('stripe_price_monthly', { length: 255 }),
    stripePriceQuarterly: varchar('stripe_price_quarterly', { length: 255 }),
    stripePriceSemiannual: varchar('stripe_price_semiannual', { length: 255 }),
    stripePriceYearly: varchar('stripe_price_yearly', { length: 255 }),
    squareSubscriptionPlanId: varchar('square_subscription_plan_id', { length: 255 }),
    squareSubscriptionPlanVariationId: varchar('square_subscription_plan_variation_id', { length: 255 }),
    discordRoleId: varchar('discord_role_id', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ===================================
// GROUPS & GUILDS
// ===================================

export const groups = mysqlTable('groups', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    coverImage: text('cover_image'),
    creatorId: int('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    privacy: mysqlEnum('privacy', ['public', 'private']).default('public').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const groupMembers = mysqlTable('group_members', {
    id: serial('id').primaryKey(),
    groupId: int('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
    userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: mysqlEnum('role', ['admin', 'moderator', 'member']).default('member').notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

// ===================================
// EVENTS
// ===================================

export const events = mysqlTable('events', {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    location: varchar('location', { length: 255 }),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time'),
    creatorId: int('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    coverImage: text('cover_image'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const eventAttendees = mysqlTable('event_attendees', {
    id: serial('id').primaryKey(),
    eventId: int('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
    userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    status: mysqlEnum('status', ['going', 'interested', 'not_going']).default('going').notNull(),
    respondedAt: timestamp('responded_at').defaultNow().notNull(),
});

// ===================================
// NOTIFICATIONS
// ===================================

export const notifications = mysqlTable('notifications', {
    id: serial('id').primaryKey(),
    userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 100 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    link: text('link'),
    read: boolean('read').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================================
// XP & ACHIEVEMENTS
// ===================================

export const xpTransactions = mysqlTable('xp_transactions', {
    id: serial('id').primaryKey(),
    userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    amount: int('amount').notNull(),
    source: varchar('source', { length: 100 }).notNull(),
    sourceId: int('source_id'),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const achievements = mysqlTable('achievements', {
    id: varchar('id', { length: 255 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description').notNull(),
    icon: varchar('icon', { length: 100 }),
    category: mysqlEnum('category', ['social', 'forum', 'leveling', 'special']).notNull(),
    xpReward: int('xp_reward').default(0).notNull(),
    requirement: text('requirement').notNull(),
    hidden: boolean('hidden').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userAchievements = mysqlTable('user_achievements', {
    id: serial('id').primaryKey(),
    userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    achievementId: varchar('achievement_id', { length: 255 }).notNull().references(() => achievements.id, { onDelete: 'cascade' }),
    progress: int('progress').default(0).notNull(),
    completed: boolean('completed').default(false).notNull(),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================================
// MODERATION
// ===================================

export const reportedContent = mysqlTable('reported_content', {
    id: serial('id').primaryKey(),
    contentType: mysqlEnum('content_type', ['social_post', 'forum_post', 'forum_reply', 'group_post', 'group_comment', 'social_comment', 'user']).notNull(),
    contentId: int('content_id').notNull(),
    reporterId: int('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    reason: varchar('reason', { length: 255 }).notNull(),
    description: text('description'),
    status: mysqlEnum('status', ['pending', 'reviewed', 'dismissed', 'actioned']).default('pending').notNull(),
    reviewedBy: int('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at'),
    reviewNotes: text('review_notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================================
// SETTINGS
// ===================================

export const siteSettings = mysqlTable('site_settings', {
    id: serial('id').primaryKey(),
    key: varchar('key', { length: 255 }).notNull().unique(),
    value: text('value'),
    category: varchar('category', { length: 100 }).default('general').notNull(),
    description: text('description'),
    isPublic: boolean('is_public').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const setupStatus = mysqlTable('setup_status', {
    id: serial('id').primaryKey(),
    isCompleted: boolean('is_completed').default(false).notNull(),
    completedAt: timestamp('completed_at'),
    adminUsername: varchar('admin_username', { length: 255 }),
    version: varchar('version', { length: 50 }).default('4.0.0').notNull(),
});

export const apiKeys = mysqlTable('api_keys', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull().unique(),
    key: text('key').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ===================================
// SERVER UPTIME TRACKING
// ===================================

export const serverUptimeRecords = mysqlTable('server_uptime_records', {
    id: serial('id').primaryKey(),
    serverId: int('server_id').notNull().references(() => servers.id, { onDelete: 'cascade' }),
    online: boolean('online').notNull(),
    playersOnline: int('players_online').default(0),
    playersMax: int('players_max').default(0),
    responseTimeMs: int('response_time_ms'),
    checkedAt: timestamp('checked_at').defaultNow().notNull(),
});

// ===================================
// ANNOUNCEMENTS
// ===================================

export const announcements = mysqlTable('announcements', {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    type: mysqlEnum('type', ['info', 'warning', 'success', 'error']).default('info').notNull(),
    authorId: int('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    published: boolean('published').default(false).notNull(),
    sendNotification: boolean('send_notification').default(true).notNull(),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ===================================
// DISCORD CHAT BRIDGE
// ===================================

export const discordMessages = mysqlTable('discord_messages', {
    id: serial('id').primaryKey(),
    discordMessageId: varchar('discord_message_id', { length: 255 }).unique(),
    authorId: varchar('author_id', { length: 255 }).notNull(),
    authorName: varchar('author_name', { length: 255 }).notNull(),
    authorAvatar: text('author_avatar'),
    content: text('content').notNull(),
    isFromWeb: boolean('is_from_web').default(false).notNull(),
    webUserId: int('web_user_id').references(() => users.id, { onDelete: 'set null' }),
    embeds: text('embeds'),
    attachments: text('attachments'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================================
// TICKET CATEGORIES/DEPARTMENTS
// ===================================

export const ticketCategories = mysqlTable('ticket_categories', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    emoji: varchar('emoji', { length: 50 }).default('🎫'),
    color: varchar('color', { length: 50 }).default('#00FFFF'),
    discordCategoryId: varchar('discord_category_id', { length: 255 }),
    channelName: varchar('channel_name', { length: 255 }).default('ticket-{number}-{username}'),
    staffRoles: text('staff_roles'),
    pingRoles: text('ping_roles'),
    requiredRoles: text('required_roles'),
    blocklist: text('blocklist'),
    openingMessage: text('opening_message'),
    image: text('image'),
    requireTopic: boolean('require_topic').default(false),
    claiming: boolean('claiming').default(true),
    feedbackEnabled: boolean('feedback_enabled').default(true),
    memberLimit: int('member_limit').default(3),
    totalLimit: int('total_limit').default(50),
    cooldown: int('cooldown'),
    ratelimit: int('ratelimit'),
    enabled: boolean('enabled').default(true),
    order: int('order').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const ticketQuestions = mysqlTable('ticket_questions', {
    id: serial('id').primaryKey(),
    categoryId: int('category_id').notNull().references(() => ticketCategories.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 255 }).notNull(),
    placeholder: varchar('placeholder', { length: 255 }),
    type: mysqlEnum('type', ['text', 'textarea', 'select']).default('text').notNull(),
    options: text('options'),
    required: boolean('required').default(true),
    minLength: int('min_length').default(0),
    maxLength: int('max_length').default(1000),
    order: int('order').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================================
// SUPPORT TICKETS
// ===================================

export const supportTickets = mysqlTable('support_tickets', {
    id: serial('id').primaryKey(),
    number: int('number').default(0),
    userId: int('user_id').references(() => users.id, { onDelete: 'set null' }),
    categoryId: int('category_id').references(() => ticketCategories.id, { onDelete: 'set null' }),
    subject: varchar('subject', { length: 255 }).notNull(),
    topic: text('topic'),
    category: mysqlEnum('category', ['account', 'billing', 'technical', 'general', 'other']).default('general').notNull(),
    priority: mysqlEnum('priority', ['low', 'normal', 'high', 'urgent']).default('normal').notNull(),
    status: mysqlEnum('status', ['open', 'in_progress', 'waiting', 'resolved', 'closed']).default('open').notNull(),
    assignedTo: int('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    discordThreadId: varchar('discord_thread_id', { length: 255 }),
    discordChannelId: varchar('discord_channel_id', { length: 255 }),
    openingMessageId: varchar('opening_message_id', { length: 255 }),
    pinnedMessageIds: text('pinned_message_ids'),
    guestEmail: varchar('guest_email', { length: 255 }),
    guestName: varchar('guest_name', { length: 255 }),
    guestAccessToken: text('guest_access_token'),
    guestAccessTokenExpires: timestamp('guest_access_token_expires'),
    discordUserId: varchar('discord_user_id', { length: 255 }),
    discordUsername: varchar('discord_username', { length: 255 }),
    claimedById: int('claimed_by_id').references(() => users.id, { onDelete: 'set null' }),
    claimedByDiscordId: varchar('claimed_by_discord_id', { length: 255 }),
    claimedAt: timestamp('claimed_at'),
    firstResponseAt: timestamp('first_response_at'),
    lastMessageAt: timestamp('last_message_at'),
    messageCount: int('message_count').default(0),
    referencesTicketId: int('references_ticket_id'),
    referencesMessageId: varchar('references_message_id', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    closedAt: timestamp('closed_at'),
    closedById: int('closed_by_id').references(() => users.id, { onDelete: 'set null' }),
    closedByDiscordId: varchar('closed_by_discord_id', { length: 255 }),
    closedReason: text('closed_reason'),
});

export const ticketMessages = mysqlTable('ticket_messages', {
    id: serial('id').primaryKey(),
    ticketId: int('ticket_id').notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),
    userId: int('user_id').references(() => users.id, { onDelete: 'set null' }),
    guestName: varchar('guest_name', { length: 255 }),
    discordUserId: varchar('discord_user_id', { length: 255 }),
    discordUsername: varchar('discord_username', { length: 255 }),
    discordAvatar: text('discord_avatar'),
    message: text('message').notNull(),
    isStaffReply: boolean('is_staff_reply').default(false).notNull(),
    isSystemMessage: boolean('is_system_message').default(false).notNull(),
    attachments: text('attachments'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const ticketAnswers = mysqlTable('ticket_answers', {
    id: serial('id').primaryKey(),
    ticketId: int('ticket_id').notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),
    questionId: int('question_id').notNull().references(() => ticketQuestions.id, { onDelete: 'cascade' }),
    answer: text('answer'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const guestTicketTokens = mysqlTable('guest_ticket_tokens', {
    id: serial('id').primaryKey(),
    ticketId: int('ticket_id').notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================================
// TICKET FEEDBACK
// ===================================

export const ticketFeedback = mysqlTable('ticket_feedback', {
    id: serial('id').primaryKey(),
    ticketId: int('ticket_id').notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),
    rating: int('rating').notNull(),
    comment: text('comment'),
    discordUserId: varchar('discord_user_id', { length: 255 }),
    userId: int('user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================================
// TICKET TAGS (Predefined Responses)
// ===================================

export const ticketTags = mysqlTable('ticket_tags', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    content: text('content').notNull(),
    emoji: varchar('emoji', { length: 50 }).default('📝'),
    categoryId: int('category_id').references(() => ticketCategories.id, { onDelete: 'set null' }),
    staffOnly: boolean('staff_only').default(true),
    enabled: boolean('enabled').default(true),
    usageCount: int('usage_count').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ===================================
// ARCHIVED MESSAGES (For Transcripts)
// ===================================

export const archivedMessages = mysqlTable('archived_messages', {
    id: varchar('id', { length: 255 }).primaryKey(),
    ticketId: int('ticket_id').notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),
    authorId: varchar('author_id', { length: 255 }).notNull(),
    authorUsername: varchar('author_username', { length: 255 }).notNull(),
    authorAvatar: text('author_avatar'),
    content: text('content'),
    attachments: text('attachments'),
    embeds: text('embeds'),
    isBot: boolean('is_bot').default(false),
    isExternal: boolean('is_external').default(false),
    createdAt: timestamp('created_at').notNull(),
});

// ===================================
// TICKET SETTINGS (Guild/Server Settings)
// ===================================

export const ticketSettings = mysqlTable('ticket_settings', {
    id: serial('id').primaryKey(),
    guildId: varchar('guild_id', { length: 255 }).notNull().unique(),
    logChannelId: varchar('log_channel_id', { length: 255 }),
    transcriptChannelId: varchar('transcript_channel_id', { length: 255 }),
    archiveEnabled: boolean('archive_enabled').default(true),
    dmOnClose: boolean('dm_on_close').default(true),
    dmOnOpen: boolean('dm_on_open').default(false),
    closeButton: boolean('close_button').default(true),
    claimButton: boolean('claim_button').default(true),
    autoCloseHours: int('auto_close_hours'),
    staleHours: int('stale_hours'),
    workingHours: text('working_hours'),
    primaryColor: varchar('primary_color', { length: 50 }).default('#00FFFF'),
    successColor: varchar('success_color', { length: 50 }).default('#00FF00'),
    errorColor: varchar('error_color', { length: 50 }).default('#FF0000'),
    footer: varchar('footer', { length: 255 }).default('Vonix Network Support'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
