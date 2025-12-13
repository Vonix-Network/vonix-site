import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';

// ===================================
// USERS & AUTHENTICATION
// ===================================

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  email: text('email'),
  password: text('password').notNull(),
  role: text('role', { enum: ['user', 'moderator', 'admin', 'superadmin'] }).default('user').notNull(),
  minecraftUsername: text('minecraft_username').unique(),
  minecraftUuid: text('minecraft_uuid').unique(),
  avatar: text('avatar'),
  bio: text('bio'),
  preferredBackground: text('preferred_background'),

  // Donation & Rank System
  donationRankId: text('donation_rank_id').references(() => donationRanks.id, { onDelete: 'set null' }),
  rankExpiresAt: integer('rank_expires_at', { mode: 'timestamp' }),
  rankPaused: integer('rank_paused', { mode: 'boolean' }).default(false),
  pausedRankId: text('paused_rank_id'),
  pausedRemainingDays: integer('paused_remaining_days'),
  pausedAt: integer('paused_at', { mode: 'timestamp' }),
  totalDonated: real('total_donated').default(0),

  // Payment Integration - Stripe
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  subscriptionStatus: text('subscription_status', { enum: ['active', 'canceled', 'past_due', 'paused', 'trialing'] }),

  // Payment Integration - Square
  squareCustomerId: text('square_customer_id').unique(),
  squareSubscriptionId: text('square_subscription_id').unique(),
  squareCardId: text('square_card_id'), // Card on file for subscription charges

  donorRank: text('donor_rank'),

  // XP & Leveling
  xp: integer('xp').default(0).notNull(), // Total XP (website + minecraft)
  websiteXp: integer('website_xp').default(0).notNull(),
  minecraftXp: integer('minecraft_xp').default(0).notNull(),
  level: integer('level').default(1).notNull(),
  title: text('title'),

  // Security
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  twoFactorEnabled: integer('two_factor_enabled', { mode: 'boolean' }).default(false),
  twoFactorSecret: text('two_factor_secret'),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
  lastLoginIp: text('last_login_ip'),
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  lockedUntil: integer('locked_until', { mode: 'timestamp' }),

  // Presence tracking
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }),

  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// SESSIONS & SECURITY
// ===================================

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  details: text('details'), // JSON
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const passwordResetTokens = sqliteTable('password_reset_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// REGISTRATION & VERIFICATION
// ===================================

export const registrationCodes = sqliteTable('registration_codes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  minecraftUsername: text('minecraft_username').notNull(),
  minecraftUuid: text('minecraft_uuid').notNull(),
  used: integer('used', { mode: 'boolean' }).default(false).notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  usedAt: integer('used_at', { mode: 'timestamp' }),
});

// ===================================
// SERVERS
// ===================================

export const servers = sqliteTable('servers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  ipAddress: text('ip_address').notNull(),
  port: integer('port').default(25565).notNull(),
  hidePort: integer('hide_port', { mode: 'boolean' }).default(false).notNull(), // For SRV records - hide port in display but use for status lookup
  modpackName: text('modpack_name'),
  bluemapUrl: text('bluemap_url'),
  curseforgeUrl: text('curseforge_url'),
  status: text('status').default('offline').notNull(),
  playersOnline: integer('players_online').default(0).notNull(),
  playersMax: integer('players_max').default(0).notNull(),
  version: text('version'),
  orderIndex: integer('order_index').default(0).notNull(),
  // XP Sync API Key - used by the Minecraft mod to authenticate
  apiKey: text('api_key').unique(),
  // Pterodactyl Panel Integration (optional)
  pterodactylServerId: text('pterodactyl_server_id'), // Server identifier in Pterodactyl panel
  pterodactylPanelUrl: text('pterodactyl_panel_url'), // Panel URL (e.g., https://panel.example.com)
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// Tracks Minecraft XP per-server per-user to prevent duplication
export const serverXp = sqliteTable('server_xp', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  serverId: integer('server_id').notNull().references(() => servers.id, { onDelete: 'cascade' }),
  xp: integer('xp').default(0).notNull(),
  level: integer('level').default(0).notNull(), // Minecraft level (informational)
  playtimeSeconds: integer('playtime_seconds').default(0),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// FORUM SYSTEM
// ===================================

export const forumCategories = sqliteTable('forum_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  slug: text('slug').notNull().unique(),
  icon: text('icon'),
  orderIndex: integer('order_index').default(0).notNull(),
  createPermission: text('create_permission', { enum: ['user', 'moderator', 'admin'] }).default('user').notNull(),
  replyPermission: text('reply_permission', { enum: ['user', 'moderator', 'admin'] }).default('user').notNull(),
  viewPermission: text('view_permission', { enum: ['user', 'moderator', 'admin'] }).default('user').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const forumPosts = sqliteTable('forum_posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  categoryId: integer('category_id').notNull().references(() => forumCategories.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorId: integer('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  pinned: integer('pinned', { mode: 'boolean' }).default(false).notNull(),
  locked: integer('locked', { mode: 'boolean' }).default(false).notNull(),
  views: integer('views').default(0).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const forumReplies = sqliteTable('forum_replies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').notNull().references(() => forumPosts.id, { onDelete: 'cascade' }),
  authorId: integer('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const forumVotes = sqliteTable('forum_votes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').references(() => forumPosts.id, { onDelete: 'cascade' }),
  replyId: integer('reply_id').references(() => forumReplies.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  voteType: text('vote_type', { enum: ['upvote', 'downvote'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// SOCIAL FEED
// ===================================

export const socialPosts = sqliteTable('social_posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  likesCount: integer('likes_count').default(0).notNull(),
  commentsCount: integer('comments_count').default(0).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const socialComments = sqliteTable('social_comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').notNull().references(() => socialPosts.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  parentCommentId: integer('parent_comment_id'),
  likesCount: integer('likes_count').default(0).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const socialLikes = sqliteTable('social_likes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: integer('post_id').notNull().references(() => socialPosts.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// FRIENDS & MESSAGING
// ===================================

export const friendships = sqliteTable('friendships', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  friendId: integer('friend_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['pending', 'accepted', 'blocked'] }).default('pending').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const privateMessages = sqliteTable('private_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  senderId: integer('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipientId: integer('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  read: integer('read', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// DONATIONS & PAYMENTS
// ===================================

export const donations = sqliteTable('donations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  minecraftUsername: text('minecraft_username'),
  minecraftUuid: text('minecraft_uuid'),
  amount: real('amount').notNull(),
  currency: text('currency').default('USD').notNull(),
  method: text('method'),
  message: text('message'),
  displayed: integer('displayed', { mode: 'boolean' }).default(true).notNull(),
  receiptNumber: text('receipt_number'),
  paymentId: text('payment_id'),
  subscriptionId: text('subscription_id'),
  rankId: text('rank_id'),
  days: integer('days'),
  paymentType: text('payment_type', { enum: ['one_time', 'subscription', 'subscription_renewal'] }).default('one_time'),
  status: text('status', { enum: ['completed', 'pending', 'failed', 'refunded'] }).default('completed').notNull(),
  stripeInvoiceId: text('stripe_invoice_id'),
  stripeInvoiceUrl: text('stripe_invoice_url'),
  stripePriceId: text('stripe_price_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const donationRanks = sqliteTable('donation_ranks', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  minAmount: real('min_amount').notNull(),
  color: text('color').notNull(),
  textColor: text('text_color').notNull(),
  icon: text('icon'),
  badge: text('badge'),
  glow: integer('glow', { mode: 'boolean' }).default(false).notNull(),
  duration: integer('duration').default(30).notNull(),
  subtitle: text('subtitle'),
  perks: text('perks'), // JSON array of perk strings
  stripeProductId: text('stripe_product_id'),
  stripePriceMonthly: text('stripe_price_monthly'),
  stripePriceQuarterly: text('stripe_price_quarterly'),
  stripePriceSemiannual: text('stripe_price_semiannual'),
  stripePriceYearly: text('stripe_price_yearly'),
  // Square catalog references
  squareSubscriptionPlanId: text('square_subscription_plan_id'),
  squareSubscriptionPlanVariationId: text('square_subscription_plan_variation_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// GROUPS & GUILDS
// ===================================

export const groups = sqliteTable('groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  coverImage: text('cover_image'),
  creatorId: integer('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  privacy: text('privacy', { enum: ['public', 'private'] }).default('public').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const groupMembers = sqliteTable('group_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  groupId: integer('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['admin', 'moderator', 'member'] }).default('member').notNull(),
  joinedAt: integer('joined_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// EVENTS
// ===================================

export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  location: text('location'),
  startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
  endTime: integer('end_time', { mode: 'timestamp' }),
  creatorId: integer('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  coverImage: text('cover_image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const eventAttendees = sqliteTable('event_attendees', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['going', 'interested', 'not_going'] }).default('going').notNull(),
  respondedAt: integer('responded_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// NOTIFICATIONS
// ===================================

export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  link: text('link'),
  read: integer('read', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// XP & ACHIEVEMENTS
// ===================================

export const xpTransactions = sqliteTable('xp_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  source: text('source').notNull(),
  sourceId: integer('source_id'),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const achievements = sqliteTable('achievements', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  icon: text('icon'),
  category: text('category', { enum: ['social', 'forum', 'leveling', 'special'] }).notNull(),
  xpReward: integer('xp_reward').default(0).notNull(),
  requirement: text('requirement').notNull(),
  hidden: integer('hidden', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const userAchievements = sqliteTable('user_achievements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  achievementId: text('achievement_id').notNull().references(() => achievements.id, { onDelete: 'cascade' }),
  progress: integer('progress').default(0).notNull(),
  completed: integer('completed', { mode: 'boolean' }).default(false).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// MODERATION
// ===================================

export const reportedContent = sqliteTable('reported_content', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  contentType: text('content_type', {
    enum: ['social_post', 'forum_post', 'forum_reply', 'group_post', 'group_comment', 'social_comment', 'user']
  }).notNull(),
  contentId: integer('content_id').notNull(),
  reporterId: integer('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  description: text('description'),
  status: text('status', { enum: ['pending', 'reviewed', 'dismissed', 'actioned'] }).default('pending').notNull(),
  reviewedBy: integer('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
  reviewNotes: text('review_notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// SETTINGS
// ===================================

export const siteSettings = sqliteTable('site_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value'),
  category: text('category').default('general').notNull(),
  description: text('description'),
  isPublic: integer('is_public', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const setupStatus = sqliteTable('setup_status', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  isCompleted: integer('is_completed', { mode: 'boolean' }).default(false).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  adminUsername: text('admin_username'),
  version: text('version').default('4.0.0').notNull(),
});

export const apiKeys = sqliteTable('api_keys', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  key: text('key').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// SERVER UPTIME TRACKING
// ===================================

export const serverUptimeRecords = sqliteTable('server_uptime_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  serverId: integer('server_id').notNull().references(() => servers.id, { onDelete: 'cascade' }),
  online: integer('online', { mode: 'boolean' }).notNull(),
  playersOnline: integer('players_online').default(0),
  playersMax: integer('players_max').default(0),
  responseTimeMs: integer('response_time_ms'),
  checkedAt: integer('checked_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// ANNOUNCEMENTS
// ===================================

export const announcements = sqliteTable('announcements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  type: text('type', { enum: ['info', 'warning', 'success', 'error'] }).default('info').notNull(),
  authorId: integer('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  published: integer('published', { mode: 'boolean' }).default(false).notNull(),
  sendNotification: integer('send_notification', { mode: 'boolean' }).default(true).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// DISCORD CHAT BRIDGE
// ===================================

export const discordMessages = sqliteTable('discord_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  discordMessageId: text('discord_message_id').unique(), // Discord's message ID
  authorId: text('author_id').notNull(), // Discord user ID or 'web:{userId}'
  authorName: text('author_name').notNull(), // Display name
  authorAvatar: text('author_avatar'), // Avatar URL
  content: text('content').notNull(),
  isFromWeb: integer('is_from_web', { mode: 'boolean' }).default(false).notNull(),
  webUserId: integer('web_user_id').references(() => users.id, { onDelete: 'set null' }),
  // For embeds and attachments
  embeds: text('embeds'), // JSON array of embed objects
  attachments: text('attachments'), // JSON array of attachment URLs
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// TYPE EXPORTS
// ===================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Server = typeof servers.$inferSelect;
export type ServerXp = typeof serverXp.$inferSelect;
export type ForumCategory = typeof forumCategories.$inferSelect;
export type ForumPost = typeof forumPosts.$inferSelect;
export type ForumReply = typeof forumReplies.$inferSelect;
export type SocialPost = typeof socialPosts.$inferSelect;
export type Friendship = typeof friendships.$inferSelect;
export type PrivateMessage = typeof privateMessages.$inferSelect;
export type Donation = typeof donations.$inferSelect;
export type DonationRank = typeof donationRanks.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type ReportedContent = typeof reportedContent.$inferSelect;
export type ServerUptimeRecord = typeof serverUptimeRecords.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type DiscordMessage = typeof discordMessages.$inferSelect;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type TicketMessage = typeof ticketMessages.$inferSelect;

// ===================================
// SUPPORT TICKETS
// ===================================

export const supportTickets = sqliteTable('support_tickets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  subject: text('subject').notNull(),
  category: text('category', { enum: ['account', 'billing', 'technical', 'general', 'other'] }).default('general').notNull(),
  priority: text('priority', { enum: ['low', 'normal', 'high', 'urgent'] }).default('normal').notNull(),
  status: text('status', { enum: ['open', 'in_progress', 'waiting', 'resolved', 'closed'] }).default('open').notNull(),
  assignedTo: integer('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  closedAt: integer('closed_at', { mode: 'timestamp' }),
});

export const ticketMessages = sqliteTable('ticket_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticketId: integer('ticket_id').notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  message: text('message').notNull(),
  isStaffReply: integer('is_staff_reply', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});
