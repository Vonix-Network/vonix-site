import { sqliteTable, AnySQLiteColumn, text, integer, foreignKey, uniqueIndex, real } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const achievements = sqliteTable("achievements", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text().notNull(),
	icon: text(),
	category: text().notNull(),
	xpReward: integer("xp_reward").default(0).notNull(),
	requirement: text().notNull(),
	hidden: integer().default(false).notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
});

export const announcements = sqliteTable("announcements", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	title: text().notNull(),
	content: text().notNull(),
	type: text().default("info").notNull(),
	authorId: integer("author_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	published: integer().default(false).notNull(),
	sendNotification: integer("send_notification").default(true).notNull(),
	expiresAt: integer("expires_at"),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`).notNull(),
});

export const apiKeys = sqliteTable("api_keys", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	name: text().notNull(),
	key: text().notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`).notNull(),
},
(table) => [
	uniqueIndex("api_keys_name_unique").on(table.name),
]);

export const auditLogs = sqliteTable("audit_logs", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	userId: integer("user_id").references(() => users.id, { onDelete: "set null" } ),
	action: text().notNull(),
	resource: text().notNull(),
	resourceId: text("resource_id"),
	details: text(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
});

export const discordMessages = sqliteTable("discord_messages", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	discordMessageId: text("discord_message_id"),
	authorId: text("author_id").notNull(),
	authorName: text("author_name").notNull(),
	authorAvatar: text("author_avatar"),
	content: text().notNull(),
	isFromWeb: integer("is_from_web").default(false).notNull(),
	webUserId: integer("web_user_id").references(() => users.id, { onDelete: "set null" } ),
	embeds: text(),
	attachments: text(),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
},
(table) => [
	uniqueIndex("discord_messages_discord_message_id_unique").on(table.discordMessageId),
]);

export const donationRanks = sqliteTable("donation_ranks", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	minAmount: real("min_amount").notNull(),
	color: text().notNull(),
	textColor: text("text_color").notNull(),
	icon: text(),
	badge: text(),
	glow: integer().default(false).notNull(),
	duration: integer().default(30).notNull(),
	subtitle: text(),
	perks: text(),
	stripeProductId: text("stripe_product_id"),
	stripePriceMonthly: text("stripe_price_monthly"),
	stripePriceQuarterly: text("stripe_price_quarterly"),
	stripePriceSemiannual: text("stripe_price_semiannual"),
	stripePriceYearly: text("stripe_price_yearly"),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`).notNull(),
	squareSubscriptionPlanId: text("square_subscription_plan_id"),
	squareSubscriptionPlanVariationId: text("square_subscription_plan_variation_id"),
	discordRoleId: text("discord_role_id"),
});

export const donations = sqliteTable("donations", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	userId: integer("user_id").references(() => users.id, { onDelete: "set null" } ),
	minecraftUsername: text("minecraft_username"),
	minecraftUuid: text("minecraft_uuid"),
	amount: real().notNull(),
	currency: text().default("USD").notNull(),
	method: text(),
	message: text(),
	displayed: integer().default(true).notNull(),
	receiptNumber: text("receipt_number"),
	paymentId: text("payment_id"),
	subscriptionId: text("subscription_id"),
	rankId: text("rank_id"),
	days: integer(),
	paymentType: text("payment_type").default("one_time"),
	status: text().default("completed").notNull(),
	stripeInvoiceId: text("stripe_invoice_id"),
	stripeInvoiceUrl: text("stripe_invoice_url"),
	stripePriceId: text("stripe_price_id"),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
});

export const eventAttendees = sqliteTable("event_attendees", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" } ),
	userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	status: text().default("going").notNull(),
	respondedAt: integer("responded_at").default(sql`(unixepoch())`).notNull(),
});

export const events = sqliteTable("events", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	title: text().notNull(),
	description: text(),
	location: text(),
	startTime: integer("start_time").notNull(),
	endTime: integer("end_time"),
	creatorId: integer("creator_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	coverImage: text("cover_image"),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
});

export const forumCategories = sqliteTable("forum_categories", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	name: text().notNull(),
	description: text(),
	slug: text().notNull(),
	icon: text(),
	orderIndex: integer("order_index").default(0).notNull(),
	createPermission: text("create_permission").default("user").notNull(),
	replyPermission: text("reply_permission").default("user").notNull(),
	viewPermission: text("view_permission").default("user").notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
},
(table) => [
	uniqueIndex("forum_categories_slug_unique").on(table.slug),
]);

export const forumPosts = sqliteTable("forum_posts", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	categoryId: integer("category_id").notNull().references(() => forumCategories.id, { onDelete: "cascade" } ),
	title: text().notNull(),
	content: text().notNull(),
	authorId: integer("author_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	pinned: integer().default(false).notNull(),
	locked: integer().default(false).notNull(),
	views: integer().default(0).notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`).notNull(),
});

export const forumReplies = sqliteTable("forum_replies", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	postId: integer("post_id").notNull().references(() => forumPosts.id, { onDelete: "cascade" } ),
	authorId: integer("author_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	content: text().notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`).notNull(),
});

export const forumVotes = sqliteTable("forum_votes", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	postId: integer("post_id").references(() => forumPosts.id, { onDelete: "cascade" } ),
	replyId: integer("reply_id").references(() => forumReplies.id, { onDelete: "cascade" } ),
	userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	voteType: text("vote_type").notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
});

export const friendships = sqliteTable("friendships", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	friendId: integer("friend_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	status: text().default("pending").notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`).notNull(),
});

export const groupMembers = sqliteTable("group_members", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" } ),
	userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	role: text().default("member").notNull(),
	joinedAt: integer("joined_at").default(sql`(unixepoch())`).notNull(),
});

export const groups = sqliteTable("groups", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	name: text().notNull(),
	description: text(),
	coverImage: text("cover_image"),
	creatorId: integer("creator_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	privacy: text().default("public").notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
});

export const notifications = sqliteTable("notifications", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	type: text().notNull(),
	title: text().notNull(),
	message: text().notNull(),
	link: text(),
	read: integer().default(false).notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
});

export const privateMessages = sqliteTable("private_messages", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	senderId: integer("sender_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	recipientId: integer("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	content: text().notNull(),
	read: integer().default(false).notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
});

export const registrationCodes = sqliteTable("registration_codes", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	code: text().notNull(),
	minecraftUsername: text("minecraft_username").notNull(),
	minecraftUuid: text("minecraft_uuid").notNull(),
	used: integer().default(false).notNull(),
	userId: integer("user_id").references(() => users.id, { onDelete: "set null" } ),
	expiresAt: integer("expires_at").notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
	usedAt: integer("used_at"),
},
(table) => [
	uniqueIndex("registration_codes_code_unique").on(table.code),
]);

export const reportedContent = sqliteTable("reported_content", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	contentType: text("content_type").notNull(),
	contentId: integer("content_id").notNull(),
	reporterId: integer("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	reason: text().notNull(),
	description: text(),
	status: text().default("pending").notNull(),
	reviewedBy: integer("reviewed_by").references(() => users.id, { onDelete: "set null" } ),
	reviewedAt: integer("reviewed_at"),
	reviewNotes: text("review_notes"),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
});

export const serverUptimeRecords = sqliteTable("server_uptime_records", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: "cascade" } ),
	online: integer().notNull(),
	playersOnline: integer("players_online").default(0),
	playersMax: integer("players_max").default(0),
	responseTimeMs: integer("response_time_ms"),
	checkedAt: integer("checked_at").default(sql`(unixepoch())`).notNull(),
});

export const serverXp = sqliteTable("server_xp", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: "cascade" } ),
	xp: integer().default(0).notNull(),
	level: integer().default(0).notNull(),
	playtimeSeconds: integer("playtime_seconds").default(0),
	lastSyncedAt: integer("last_synced_at").default(sql`(unixepoch())`).notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
});

export const servers = sqliteTable("servers", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	name: text().notNull(),
	description: text(),
	ipAddress: text("ip_address").notNull(),
	port: integer().default(25565).notNull(),
	hidePort: integer("hide_port").default(false).notNull(),
	modpackName: text("modpack_name"),
	bluemapUrl: text("bluemap_url"),
	curseforgeUrl: text("curseforge_url"),
	status: text().default("offline").notNull(),
	playersOnline: integer("players_online").default(0).notNull(),
	playersMax: integer("players_max").default(0).notNull(),
	version: text(),
	orderIndex: integer("order_index").default(0).notNull(),
	apiKey: text("api_key"),
	pterodactylServerId: text("pterodactyl_server_id"),
	pterodactylPanelUrl: text("pterodactyl_panel_url"),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`).notNull(),
},
(table) => [
	uniqueIndex("servers_api_key_unique").on(table.apiKey),
]);

export const sessions = sqliteTable("sessions", {
	id: text().primaryKey().notNull(),
	userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	expiresAt: integer("expires_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
});

export const setupStatus = sqliteTable("setup_status", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	isCompleted: integer("is_completed").default(false).notNull(),
	completedAt: integer("completed_at"),
	adminUsername: text("admin_username"),
	version: text().default("4.0.0").notNull(),
});

export const siteSettings = sqliteTable("site_settings", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	key: text().notNull(),
	value: text(),
	category: text().default("general").notNull(),
	description: text(),
	isPublic: integer("is_public").default(false).notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`).notNull(),
},
(table) => [
	uniqueIndex("site_settings_key_unique").on(table.key),
]);

export const socialComments = sqliteTable("social_comments", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	postId: integer("post_id").notNull().references(() => socialPosts.id, { onDelete: "cascade" } ),
	userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	content: text().notNull(),
	parentCommentId: integer("parent_comment_id"),
	likesCount: integer("likes_count").default(0).notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`).notNull(),
});

export const socialLikes = sqliteTable("social_likes", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	postId: integer("post_id").notNull().references(() => socialPosts.id, { onDelete: "cascade" } ),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
});

export const socialPosts = sqliteTable("social_posts", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	content: text().notNull(),
	imageUrl: text("image_url"),
	likesCount: integer("likes_count").default(0).notNull(),
	commentsCount: integer("comments_count").default(0).notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`).notNull(),
});

export const userAchievements = sqliteTable("user_achievements", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	achievementId: text("achievement_id").notNull().references(() => achievements.id, { onDelete: "cascade" } ),
	progress: integer().default(0).notNull(),
	completed: integer().default(false).notNull(),
	completedAt: integer("completed_at"),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
});

export const users = sqliteTable("users", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	username: text().notNull(),
	email: text(),
	password: text().notNull(),
	role: text().default("user").notNull(),
	minecraftUsername: text("minecraft_username"),
	minecraftUuid: text("minecraft_uuid"),
	avatar: text(),
	bio: text(),
	preferredBackground: text("preferred_background"),
	donationRankId: text("donation_rank_id").references(() => donationRanks.id, { onDelete: "set null" } ),
	rankExpiresAt: integer("rank_expires_at"),
	rankPaused: integer("rank_paused").default(false),
	pausedRankId: text("paused_rank_id"),
	pausedRemainingDays: integer("paused_remaining_days"),
	pausedAt: integer("paused_at"),
	totalDonated: real("total_donated"),
	stripeCustomerId: text("stripe_customer_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),
	subscriptionStatus: text("subscription_status"),
	donorRank: text("donor_rank"),
	xp: integer().default(0).notNull(),
	websiteXp: integer("website_xp").default(0).notNull(),
	minecraftXp: integer("minecraft_xp").default(0).notNull(),
	level: integer().default(1).notNull(),
	title: text(),
	emailVerified: integer("email_verified").default(false),
	twoFactorEnabled: integer("two_factor_enabled").default(false),
	twoFactorSecret: text("two_factor_secret"),
	lastLoginAt: integer("last_login_at"),
	lastLoginIp: text("last_login_ip"),
	failedLoginAttempts: integer("failed_login_attempts").default(0),
	lockedUntil: integer("locked_until"),
	lastSeenAt: integer("last_seen_at"),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`).notNull(),
	squareCustomerId: text("square_customer_id"),
	squareSubscriptionId: text("square_subscription_id"),
	squareCardId: text("square_card_id"),
	discordId: text("discord_id"),
	discordUsername: text("discord_username"),
	discordAvatar: text("discord_avatar"),
},
(table) => [
	uniqueIndex("users_discord_id_unique").on(table.discordId),
	uniqueIndex("users_square_subscription_id_unique").on(table.squareSubscriptionId),
	uniqueIndex("users_square_customer_id_unique").on(table.squareCustomerId),
	uniqueIndex("users_stripe_subscription_id_unique").on(table.stripeSubscriptionId),
	uniqueIndex("users_stripe_customer_id_unique").on(table.stripeCustomerId),
	uniqueIndex("users_minecraft_uuid_unique").on(table.minecraftUuid),
	uniqueIndex("users_minecraft_username_unique").on(table.minecraftUsername),
	uniqueIndex("users_username_unique").on(table.username),
]);

export const xpTransactions = sqliteTable("xp_transactions", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	amount: integer().notNull(),
	source: text().notNull(),
	sourceId: integer("source_id"),
	description: text(),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
});

export const passwordResetTokens = sqliteTable("password_reset_tokens", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	token: text().notNull(),
	expiresAt: integer("expires_at").notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
},
(table) => [
	uniqueIndex("password_reset_tokens_token_unique").on(table.token),
]);

export const supportTickets = sqliteTable("support_tickets", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	userId: integer("user_id").references(() => users.id, { onDelete: "set null" } ),
	subject: text().notNull(),
	category: text().default("general").notNull(),
	priority: text().default("normal").notNull(),
	status: text().default("open").notNull(),
	assignedTo: integer("assigned_to").references(() => users.id, { onDelete: "set null" } ),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`).notNull(),
	closedAt: integer("closed_at"),
	discordThreadId: text("discord_thread_id"),
});

export const ticketMessages = sqliteTable("ticket_messages", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	ticketId: integer("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" } ),
	userId: integer("user_id").references(() => users.id, { onDelete: "set null" } ),
	message: text().notNull(),
	isStaffReply: integer("is_staff_reply").default(false).notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
});

