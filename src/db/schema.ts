import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, real, primaryKey } from 'drizzle-orm/sqlite-core';

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

  // Payment Integration
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  subscriptionStatus: text('subscription_status', { enum: ['active', 'canceled', 'past_due', 'paused', 'trialing'] }),
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
  address: text('address').notNull(),
  port: integer('port').default(25565).notNull(),
  type: text('type', { enum: ['lobby', 'survival', 'creative', 'minigame'] }).notNull(),
  online: integer('online', { mode: 'boolean' }).default(false).notNull(),
  playersOnline: integer('players_online').default(0).notNull(),
  playersMax: integer('players_max').default(0).notNull(),
  motd: text('motd'),
  version: text('version'),
  lastCheckedAt: integer('last_checked_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const serverXp = sqliteTable('server_xp', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  serverId: integer('server_id').notNull().references(() => servers.id, { onDelete: 'cascade' }),
  amount: integer('amount').default(0).notNull(), // XP gained on this server
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// FORUM
// ===================================

export const forumCategories = sqliteTable('forum_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  icon: text('icon'),
  color: text('color'),
  order: integer('order').default(0),
  parentId: integer('parent_id').references((): any => forumCategories.id), // Recursive reference
  minRole: text('min_role', { enum: ['user', 'moderator', 'admin', 'superadmin'] }).default('user'),
  isPrivate: integer('is_private', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const forumPosts = sqliteTable('forum_posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(), // URL-friendly slug
  content: text('content').notNull(), // Markdown or HTML
  authorId: integer('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').notNull().references(() => forumCategories.id, { onDelete: 'cascade' }),
  views: integer('views').default(0),
  isPinned: integer('is_pinned', { mode: 'boolean' }).default(false),
  isLocked: integer('is_locked', { mode: 'boolean' }).default(false),
  lastActivityAt: integer('last_activity_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const forumReplies = sqliteTable('forum_replies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  content: text('content').notNull(),
  authorId: integer('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: integer('post_id').notNull().references(() => forumPosts.id, { onDelete: 'cascade' }),
  isSolution: integer('is_solution', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// SOCIAL
// ===================================

export const socialPosts = sqliteTable('social_posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  content: text('content').notNull(),
  authorId: integer('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  likes: integer('likes').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const friendships = sqliteTable('friendships', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  requesterId: integer('requester_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  addresseeId: integer('addressee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['pending', 'accepted', 'blocked'] }).default('pending').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const privateMessages = sqliteTable('private_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  senderId: integer('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: integer('receiver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  read: integer('read', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// DONATION SYSTEM - PRODUCTS
// ===================================

export const donationRanks = sqliteTable('donation_ranks', {
  id: text('id').primaryKey(), // Using text ID like 'vip', 'mvp', 'legend'
  name: text('name').notNull(),
  description: text('description'),
  priceMonth: integer('price_month'), // Price in cents
  stripePriceId: text('stripe_price_id'), // Stripe ID for subscription
  features: text('features'), // JSON array of features
  color: text('color'), // Hex color for chat/display
  weight: integer('weight').default(0), // For hierarchy/permissions
  showInStore: integer('show_in_store', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const donations = sqliteTable('donations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'set null' }),
  amount: integer('amount').notNull(), // In cents
  currency: text('currency').default('usd'),
  status: text('status').notNull(), // 'succeeded', 'pending', 'failed'
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  type: text('type', { enum: ['rank', 'one_time', 'subscription'] }).notNull(),
  itemId: text('item_id'), // Reference to rank ID or other item
  metadata: text('metadata'), // JSON for extra info
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// GROUPS / GUILDS
// ===================================

export const groups = sqliteTable('groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  leaderId: integer('leader_id').notNull().references(() => users.id),
  banner: text('banner'),
  level: integer('level').default(1),
  xp: integer('xp').default(0),
  isPublic: integer('is_public', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// EVENTS
// ===================================

export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
  endTime: integer('end_time', { mode: 'timestamp' }).notNull(),
  location: text('location'), // e.g., "Main Lobby" or "Survival Server"
  hostId: integer('host_id').references(() => users.id),
  banner: text('banner'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// NOTIFICATIONS
// ===================================

export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type', { enum: ['info', 'success', 'warning', 'error', 'system', 'message', 'friend_request'] }).default('info'),
  read: integer('read', { mode: 'boolean' }).default(false),
  link: text('link'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// ACHIEVEMENTS
// ===================================

export const achievements = sqliteTable('achievements', {
  id: text('id').primaryKey(), // e.g., 'first_login', 'level_10'
  name: text('name').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull(), // Lucide icon name
  xpReward: integer('xp_reward').default(0),
  secret: integer('secret', { mode: 'boolean' }).default(false),
});

export const userAchievements = sqliteTable('user_achievements', {
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  achievementId: text('achievement_id').notNull().references(() => achievements.id, { onDelete: 'cascade' }),
  unlockedAt: integer('unlocked_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.achievementId] }),
}));

// ===================================
// REPORTING
// ===================================

export const reportedContent = sqliteTable('reported_content', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reporterId: integer('reporter_id').notNull().references(() => users.id),
  reportedId: integer('reported_id').references(() => users.id), // If reporting a user
  contentType: text('content_type').notNull(), // 'post', 'reply', 'user', 'message'
  contentId: text('content_id').notNull(), // ID of the reported content
  reason: text('reason').notNull(),
  description: text('description'),
  status: text('status', { enum: ['pending', 'resolved', 'dismissed'] }).default('pending'),
  resolvedBy: integer('resolved_by').references(() => users.id),
  resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

// ===================================
// SETTINGS
// ===================================

export const siteSettings = sqliteTable('site_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  description: text('description'),
  category: text('category').default('general').notNull(),
  isPublic: integer('is_public', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
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
export type SiteSetting = typeof siteSettings.$inferSelect;
