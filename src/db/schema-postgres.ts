/**
 * PostgreSQL/Supabase Schema
 * Used for PostgreSQL databases including Supabase
 */
import { sql } from 'drizzle-orm';
import { pgTable, serial, text, integer, boolean, timestamp, real, varchar, pgEnum } from 'drizzle-orm/pg-core';

// ===================================
// ENUMS
// ===================================

export const userRoleEnum = pgEnum('user_role', ['user', 'moderator', 'admin', 'superadmin']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'canceled', 'past_due', 'paused', 'trialing']);
export const friendshipStatusEnum = pgEnum('friendship_status', ['pending', 'accepted', 'blocked']);
export const voteTypeEnum = pgEnum('vote_type', ['upvote', 'downvote']);
export const paymentTypeEnum = pgEnum('payment_type', ['one_time', 'subscription', 'subscription_renewal']);
export const paymentStatusEnum = pgEnum('payment_status', ['completed', 'pending', 'failed', 'refunded']);
export const groupPrivacyEnum = pgEnum('group_privacy', ['public', 'private']);
export const groupRoleEnum = pgEnum('group_role', ['admin', 'moderator', 'member']);
export const eventStatusEnum = pgEnum('event_status', ['going', 'interested', 'not_going']);
export const achievementCategoryEnum = pgEnum('achievement_category', ['social', 'forum', 'leveling', 'special']);
export const contentTypeEnum = pgEnum('content_type', ['social_post', 'forum_post', 'forum_reply', 'group_post', 'group_comment', 'social_comment', 'user']);
export const reportStatusEnum = pgEnum('report_status', ['pending', 'reviewed', 'dismissed', 'actioned']);
export const announcementTypeEnum = pgEnum('announcement_type', ['info', 'warning', 'success', 'error']);
export const ticketCategoryEnum = pgEnum('ticket_category', ['account', 'billing', 'technical', 'general', 'other']);
export const ticketPriorityEnum = pgEnum('ticket_priority', ['low', 'normal', 'high', 'urgent']);
export const ticketStatusEnum = pgEnum('ticket_status', ['open', 'in_progress', 'waiting', 'resolved', 'closed']);
export const permissionLevelEnum = pgEnum('permission_level', ['user', 'moderator', 'admin']);
export const questionTypeEnum = pgEnum('question_type', ['text', 'textarea', 'select']);

// ===================================
// USERS & AUTHENTICATION
// ===================================

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    username: varchar('username', { length: 255 }).notNull().unique(),
    email: varchar('email', { length: 255 }),
    password: text('password').notNull(),
    role: userRoleEnum('role').default('user').notNull(),
    minecraftUsername: varchar('minecraft_username', { length: 255 }).unique(),
    minecraftUuid: varchar('minecraft_uuid', { length: 36 }).unique(),
    avatar: text('avatar'),
    bio: text('bio'),
    preferredBackground: text('preferred_background'),

    // Avatar/Skin Viewer Settings
    avatarAnimation: varchar('avatar_animation', { length: 50 }).default('walking'),
    avatarAutoRotate: boolean('avatar_auto_rotate').default(true),
    avatarRotateSpeed: real('avatar_rotate_speed').default(0.5),
    avatarZoom: real('avatar_zoom').default(0.9),
    avatarAnimationSpeed: real('avatar_animation_speed').default(1),
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
    pausedRemainingDays: integer('paused_remaining_days'),
    pausedAt: timestamp('paused_at'),
    totalDonated: real('total_donated').default(0),

    // Payment Integration - Stripe
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).unique(),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }).unique(),
    subscriptionStatus: subscriptionStatusEnum('subscription_status'),

    // Payment Integration - Square
    squareCustomerId: varchar('square_customer_id', { length: 255 }).unique(),
    squareSubscriptionId: varchar('square_subscription_id', { length: 255 }).unique(),
    squareCardId: varchar('square_card_id', { length: 255 }),

    donorRank: varchar('donor_rank', { length: 255 }),

    // XP & Leveling
    xp: integer('xp').default(0).notNull(),
    websiteXp: integer('website_xp').default(0).notNull(),
    minecraftXp: integer('minecraft_xp').default(0).notNull(),
    level: integer('level').default(1).notNull(),
    title: varchar('title', { length: 255 }),

    // Security
    emailVerified: boolean('email_verified').default(false),
    twoFactorEnabled: boolean('two_factor_enabled').default(false),
    twoFactorSecret: text('two_factor_secret'),
    lastLoginAt: timestamp('last_login_at'),
    lastLoginIp: varchar('last_login_ip', { length: 45 }),
    failedLoginAttempts: integer('failed_login_attempts').default(0),
    lockedUntil: timestamp('locked_until'),

    // Presence tracking
    lastSeenAt: timestamp('last_seen_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ===================================
// SESSIONS & SECURITY
// ===================================

export const sessions = pgTable('sessions', {
    id: text('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at').notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 255 }).notNull(),
    resource: varchar('resource', { length: 255 }).notNull(),
    resourceId: varchar('resource_id', { length: 255 }),
    details: text('details'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================================
// REGISTRATION & VERIFICATION
// ===================================

export const registrationCodes = pgTable('registration_codes', {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 255 }).notNull().unique(),
    minecraftUsername: varchar('minecraft_username', { length: 255 }).notNull(),
    minecraftUuid: varchar('minecraft_uuid', { length: 36 }).notNull(),
    used: boolean('used').default(false).notNull(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    usedAt: timestamp('used_at'),
});

// ===================================
// SERVERS
// ===================================

export const servers = pgTable('servers', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    ipAddress: varchar('ip_address', { length: 255 }).notNull(),
    port: integer('port').default(25565).notNull(),
    hidePort: boolean('hide_port').default(false).notNull(),
    gameType: varchar('game_type', { length: 50 }).default('minecraft').notNull(), // 'minecraft' | 'hytale'
    modpackName: varchar('modpack_name', { length: 255 }),
    bluemapUrl: text('bluemap_url'),
    curseforgeUrl: text('curseforge_url'),
    status: varchar('status', { length: 50 }).default('offline').notNull(),
    playersOnline: integer('players_online').default(0).notNull(),
    playersMax: integer('players_max').default(0).notNull(),
    version: varchar('version', { length: 100 }),
    orderIndex: integer('order_index').default(0).notNull(),
    apiKey: text('api_key').unique(),
    pterodactylServerId: varchar('pterodactyl_server_id', { length: 255 }),
    pterodactylPanelUrl: text('pterodactyl_panel_url'),
    // Maintenance mode - disables status checks and shows maintenance badge
    maintenanceMode: boolean('maintenance_mode').default(false).notNull(),
    maintenanceMessage: text('maintenance_message'),
    // Persistent consecutive failure tracking for offline notifications
    consecutiveFailures: integer('consecutive_failures').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const serverXp = pgTable('server_xp', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    serverId: integer('server_id').notNull().references(() => servers.id, { onDelete: 'cascade' }),
    xp: integer('xp').default(0).notNull(),
    level: integer('level').default(0).notNull(),
    playtimeSeconds: integer('playtime_seconds').default(0),
    lastSyncedAt: timestamp('last_synced_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Minecraft players table - stores XP for players who haven't registered on the website
// This allows the leaderboard to show ALL players, not just registered ones
export const minecraftPlayers = pgTable('minecraft_players', {
    id: serial('id').primaryKey(),
    uuid: varchar('uuid', { length: 36 }).notNull().unique(),
    username: varchar('username', { length: 255 }).notNull(),
    xp: integer('xp').default(0).notNull(),
    level: integer('level').default(0).notNull(),
    playtimeSeconds: integer('playtime_seconds').default(0),
    lastSyncedAt: timestamp('last_synced_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    // When a user registers with this UUID, this field links to their account
    linkedUserId: integer('linked_user_id').references(() => users.id, { onDelete: 'set null' }),
});

// ===================================
// FORUM SYSTEM
// ===================================

export const forumCategories = pgTable('forum_categories', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    icon: varchar('icon', { length: 100 }),
    orderIndex: integer('order_index').default(0).notNull(),
    createPermission: permissionLevelEnum('create_permission').default('user').notNull(),
    replyPermission: permissionLevelEnum('reply_permission').default('user').notNull(),
    viewPermission: permissionLevelEnum('view_permission').default('user').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const forumPosts = pgTable('forum_posts', {
    id: serial('id').primaryKey(),
    categoryId: integer('category_id').notNull().references(() => forumCategories.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    authorId: integer('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    pinned: boolean('pinned').default(false).notNull(),
    locked: boolean('locked').default(false).notNull(),
    views: integer('views').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const forumReplies = pgTable('forum_replies', {
    id: serial('id').primaryKey(),
    postId: integer('post_id').notNull().references(() => forumPosts.id, { onDelete: 'cascade' }),
    authorId: integer('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const forumVotes = pgTable('forum_votes', {
    id: serial('id').primaryKey(),
    postId: integer('post_id').references(() => forumPosts.id, { onDelete: 'cascade' }),
    replyId: integer('reply_id').references(() => forumReplies.id, { onDelete: 'cascade' }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    voteType: voteTypeEnum('vote_type').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================================
// SOCIAL FEED
// ===================================

export const socialPosts = pgTable('social_posts', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    imageUrl: text('image_url'),
    likesCount: integer('likes_count').default(0).notNull(),
    commentsCount: integer('comments_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const socialComments = pgTable('social_comments', {
    id: serial('id').primaryKey(),
    postId: integer('post_id').notNull().references(() => socialPosts.id, { onDelete: 'cascade' }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    parentCommentId: integer('parent_comment_id'),
    likesCount: integer('likes_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const socialLikes = pgTable('social_likes', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    postId: integer('post_id').notNull().references(() => socialPosts.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================================
// FRIENDS & MESSAGING
// ===================================

export const friendships = pgTable('friendships', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    friendId: integer('friend_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    status: friendshipStatusEnum('status').default('pending').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const privateMessages = pgTable('private_messages', {
    id: serial('id').primaryKey(),
    senderId: integer('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    recipientId: integer('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    read: boolean('read').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================================
// DONATIONS & PAYMENTS
// ===================================

export const donations = pgTable('donations', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    minecraftUsername: varchar('minecraft_username', { length: 255 }),
    minecraftUuid: varchar('minecraft_uuid', { length: 36 }),
    amount: real('amount').notNull(),
    currency: varchar('currency', { length: 10 }).default('USD').notNull(),
    method: varchar('method', { length: 100 }),
    message: text('message'),
    displayed: boolean('displayed').default(true).notNull(),
    receiptNumber: varchar('receipt_number', { length: 255 }),
    paymentId: varchar('payment_id', { length: 255 }),
    subscriptionId: varchar('subscription_id', { length: 255 }),
    rankId: varchar('rank_id', { length: 255 }),
    days: integer('days'),
    paymentType: paymentTypeEnum('payment_type').default('one_time'),
    status: paymentStatusEnum('status').default('completed').notNull(),
    stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }),
    stripeInvoiceUrl: text('stripe_invoice_url'),
    stripePriceId: varchar('stripe_price_id', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const donationRanks = pgTable('donation_ranks', {
    id: varchar('id', { length: 255 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    minAmount: real('min_amount').notNull(),
    color: varchar('color', { length: 50 }).notNull(),
    textColor: varchar('text_color', { length: 50 }).notNull(),
    icon: varchar('icon', { length: 100 }),
    badge: varchar('badge', { length: 255 }),
    glow: boolean('glow').default(false).notNull(),
    duration: integer('duration').default(30).notNull(),
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

export const groups = pgTable('groups', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    coverImage: text('cover_image'),
    creatorId: integer('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    privacy: groupPrivacyEnum('privacy').default('public').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const groupMembers = pgTable('group_members', {
    id: serial('id').primaryKey(),
    groupId: integer('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: groupRoleEnum('role').default('member').notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

// ===================================
// EVENTS
// ===================================

export const events = pgTable('events', {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    location: varchar('location', { length: 255 }),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time'),
    creatorId: integer('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    coverImage: text('cover_image'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const eventAttendees = pgTable('event_attendees', {
    id: serial('id').primaryKey(),
    eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    status: eventStatusEnum('status').default('going').notNull(),
    respondedAt: timestamp('responded_at').defaultNow().notNull(),
});

// ===================================
// NOTIFICATIONS
// ===================================

export const notifications = pgTable('notifications', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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

export const xpTransactions = pgTable('xp_transactions', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    source: varchar('source', { length: 100 }).notNull(),
    sourceId: integer('source_id'),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const achievements = pgTable('achievements', {
    id: varchar('id', { length: 255 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description').notNull(),
    icon: varchar('icon', { length: 100 }),
    category: achievementCategoryEnum('category').notNull(),
    xpReward: integer('xp_reward').default(0).notNull(),
    requirement: text('requirement').notNull(),
    hidden: boolean('hidden').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userAchievements = pgTable('user_achievements', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    achievementId: varchar('achievement_id', { length: 255 }).notNull().references(() => achievements.id, { onDelete: 'cascade' }),
    progress: integer('progress').default(0).notNull(),
    completed: boolean('completed').default(false).notNull(),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================================
// MODERATION
// ===================================

export const reportedContent = pgTable('reported_content', {
    id: serial('id').primaryKey(),
    contentType: contentTypeEnum('content_type').notNull(),
    contentId: integer('content_id').notNull(),
    reporterId: integer('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    reason: varchar('reason', { length: 255 }).notNull(),
    description: text('description'),
    status: reportStatusEnum('status').default('pending').notNull(),
    reviewedBy: integer('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at'),
    reviewNotes: text('review_notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================================
// SETTINGS
// ===================================

export const siteSettings = pgTable('site_settings', {
    id: serial('id').primaryKey(),
    key: varchar('key', { length: 255 }).notNull().unique(),
    value: text('value'),
    category: varchar('category', { length: 100 }).default('general').notNull(),
    description: text('description'),
    isPublic: boolean('is_public').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const setupStatus = pgTable('setup_status', {
    id: serial('id').primaryKey(),
    isCompleted: boolean('is_completed').default(false).notNull(),
    completedAt: timestamp('completed_at'),
    adminUsername: varchar('admin_username', { length: 255 }),
    version: varchar('version', { length: 50 }).default('4.0.0').notNull(),
});

export const apiKeys = pgTable('api_keys', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull().unique(),
    key: text('key').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ===================================
// SERVER UPTIME TRACKING
// ===================================

export const serverUptimeRecords = pgTable('server_uptime_records', {
    id: serial('id').primaryKey(),
    serverId: integer('server_id').notNull().references(() => servers.id, { onDelete: 'cascade' }),
    online: boolean('online').notNull(),
    playersOnline: integer('players_online').default(0),
    playersMax: integer('players_max').default(0),
    responseTimeMs: integer('response_time_ms'),
    checkedAt: timestamp('checked_at').defaultNow().notNull(),
});

// ===================================
// ANNOUNCEMENTS
// ===================================

export const announcements = pgTable('announcements', {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    type: announcementTypeEnum('type').default('info').notNull(),
    authorId: integer('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    published: boolean('published').default(false).notNull(),
    sendNotification: boolean('send_notification').default(true).notNull(),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ===================================
// DISCORD CHAT BRIDGE
// ===================================

export const discordMessages = pgTable('discord_messages', {
    id: serial('id').primaryKey(),
    discordMessageId: varchar('discord_message_id', { length: 255 }).unique(),
    authorId: varchar('author_id', { length: 255 }).notNull(),
    authorName: varchar('author_name', { length: 255 }).notNull(),
    authorAvatar: text('author_avatar'),
    content: text('content').notNull(),
    isFromWeb: boolean('is_from_web').default(false).notNull(),
    webUserId: integer('web_user_id').references(() => users.id, { onDelete: 'set null' }),
    embeds: text('embeds'),
    attachments: text('attachments'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================================
// TICKET CATEGORIES/DEPARTMENTS
// ===================================

export const ticketCategories = pgTable('ticket_categories', {
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
    memberLimit: integer('member_limit').default(3),
    totalLimit: integer('total_limit').default(50),
    cooldown: integer('cooldown'),
    ratelimit: integer('ratelimit'),
    enabled: boolean('enabled').default(true),
    order: integer('order').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const ticketQuestions = pgTable('ticket_questions', {
    id: serial('id').primaryKey(),
    categoryId: integer('category_id').notNull().references(() => ticketCategories.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 255 }).notNull(),
    placeholder: varchar('placeholder', { length: 255 }),
    type: questionTypeEnum('type').default('text').notNull(),
    options: text('options'),
    required: boolean('required').default(true),
    minLength: integer('min_length').default(0),
    maxLength: integer('max_length').default(1000),
    order: integer('order').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================================
// SUPPORT TICKETS
// ===================================

export const supportTickets = pgTable('support_tickets', {
    id: serial('id').primaryKey(),
    number: integer('number').default(0),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    categoryId: integer('category_id').references(() => ticketCategories.id, { onDelete: 'set null' }),
    subject: varchar('subject', { length: 255 }).notNull(),
    topic: text('topic'),
    category: ticketCategoryEnum('category').default('general').notNull(),
    priority: ticketPriorityEnum('priority').default('normal').notNull(),
    status: ticketStatusEnum('status').default('open').notNull(),
    assignedTo: integer('assigned_to').references(() => users.id, { onDelete: 'set null' }),
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
    claimedById: integer('claimed_by_id').references(() => users.id, { onDelete: 'set null' }),
    claimedByDiscordId: varchar('claimed_by_discord_id', { length: 255 }),
    claimedAt: timestamp('claimed_at'),
    firstResponseAt: timestamp('first_response_at'),
    lastMessageAt: timestamp('last_message_at'),
    messageCount: integer('message_count').default(0),
    referencesTicketId: integer('references_ticket_id'),
    referencesMessageId: varchar('references_message_id', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    closedAt: timestamp('closed_at'),
    closedById: integer('closed_by_id').references(() => users.id, { onDelete: 'set null' }),
    closedByDiscordId: varchar('closed_by_discord_id', { length: 255 }),
    closedReason: text('closed_reason'),
});

export const ticketMessages = pgTable('ticket_messages', {
    id: serial('id').primaryKey(),
    ticketId: integer('ticket_id').notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
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

export const ticketAnswers = pgTable('ticket_answers', {
    id: serial('id').primaryKey(),
    ticketId: integer('ticket_id').notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),
    questionId: integer('question_id').notNull().references(() => ticketQuestions.id, { onDelete: 'cascade' }),
    answer: text('answer'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const guestTicketTokens = pgTable('guest_ticket_tokens', {
    id: serial('id').primaryKey(),
    ticketId: integer('ticket_id').notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================================
// TICKET FEEDBACK
// ===================================

export const ticketFeedback = pgTable('ticket_feedback', {
    id: serial('id').primaryKey(),
    ticketId: integer('ticket_id').notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    discordUserId: varchar('discord_user_id', { length: 255 }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ===================================
// TICKET TAGS (Predefined Responses)
// ===================================

export const ticketTags = pgTable('ticket_tags', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    content: text('content').notNull(),
    emoji: varchar('emoji', { length: 50 }).default('📝'),
    categoryId: integer('category_id').references(() => ticketCategories.id, { onDelete: 'set null' }),
    staffOnly: boolean('staff_only').default(true),
    enabled: boolean('enabled').default(true),
    usageCount: integer('usage_count').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ===================================
// ARCHIVED MESSAGES (For Transcripts)
// ===================================

export const archivedMessages = pgTable('archived_messages', {
    id: varchar('id', { length: 255 }).primaryKey(),
    ticketId: integer('ticket_id').notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),
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

export const ticketSettings = pgTable('ticket_settings', {
    id: serial('id').primaryKey(),
    guildId: varchar('guild_id', { length: 255 }).notNull().unique(),
    logChannelId: varchar('log_channel_id', { length: 255 }),
    transcriptChannelId: varchar('transcript_channel_id', { length: 255 }),
    archiveEnabled: boolean('archive_enabled').default(true),
    dmOnClose: boolean('dm_on_close').default(true),
    dmOnOpen: boolean('dm_on_open').default(false),
    closeButton: boolean('close_button').default(true),
    claimButton: boolean('claim_button').default(true),
    autoCloseHours: integer('auto_close_hours'),
    staleHours: integer('stale_hours'),
    workingHours: text('working_hours'),
    primaryColor: varchar('primary_color', { length: 50 }).default('#00FFFF'),
    successColor: varchar('success_color', { length: 50 }).default('#00FF00'),
    errorColor: varchar('error_color', { length: 50 }).default('#FF0000'),
    footer: varchar('footer', { length: 255 }).default('Vonix Network Support'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
