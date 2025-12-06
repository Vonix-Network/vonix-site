CREATE TABLE `achievements` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`icon` text,
	`category` text NOT NULL,
	`xp_reward` integer DEFAULT 0 NOT NULL,
	`requirement` text NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`type` text DEFAULT 'info' NOT NULL,
	`author_id` integer NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`send_notification` integer DEFAULT true NOT NULL,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`key` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_name_unique` ON `api_keys` (`name`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`action` text NOT NULL,
	`resource` text NOT NULL,
	`resource_id` text,
	`details` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `discord_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`discord_message_id` text,
	`author_id` text NOT NULL,
	`author_name` text NOT NULL,
	`author_avatar` text,
	`content` text NOT NULL,
	`is_from_web` integer DEFAULT false NOT NULL,
	`web_user_id` integer,
	`embeds` text,
	`attachments` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`web_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `discord_messages_discord_message_id_unique` ON `discord_messages` (`discord_message_id`);--> statement-breakpoint
CREATE TABLE `donation_ranks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`min_amount` real NOT NULL,
	`color` text NOT NULL,
	`text_color` text NOT NULL,
	`icon` text,
	`badge` text,
	`glow` integer DEFAULT false NOT NULL,
	`duration` integer DEFAULT 30 NOT NULL,
	`subtitle` text,
	`perks` text,
	`stripe_product_id` text,
	`stripe_price_monthly` text,
	`stripe_price_quarterly` text,
	`stripe_price_semiannual` text,
	`stripe_price_yearly` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `donations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`minecraft_username` text,
	`minecraft_uuid` text,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`method` text,
	`message` text,
	`displayed` integer DEFAULT true NOT NULL,
	`receipt_number` text,
	`payment_id` text,
	`subscription_id` text,
	`rank_id` text,
	`days` integer,
	`payment_type` text DEFAULT 'one_time',
	`status` text DEFAULT 'completed' NOT NULL,
	`stripe_invoice_id` text,
	`stripe_invoice_url` text,
	`stripe_price_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `event_attendees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`status` text DEFAULT 'going' NOT NULL,
	`responded_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`location` text,
	`start_time` integer NOT NULL,
	`end_time` integer,
	`creator_id` integer NOT NULL,
	`cover_image` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `forum_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`slug` text NOT NULL,
	`icon` text,
	`order_index` integer DEFAULT 0 NOT NULL,
	`create_permission` text DEFAULT 'user' NOT NULL,
	`reply_permission` text DEFAULT 'user' NOT NULL,
	`view_permission` text DEFAULT 'user' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `forum_categories_slug_unique` ON `forum_categories` (`slug`);--> statement-breakpoint
CREATE TABLE `forum_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_id` integer NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`author_id` integer NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`locked` integer DEFAULT false NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `forum_categories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `forum_replies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`author_id` integer NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `forum_posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `forum_votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer,
	`reply_id` integer,
	`user_id` integer NOT NULL,
	`vote_type` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `forum_posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reply_id`) REFERENCES `forum_replies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `friendships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`friend_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`friend_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `group_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`joined_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`cover_image` text,
	`creator_id` integer NOT NULL,
	`privacy` text DEFAULT 'public' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`link` text,
	`read` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `private_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sender_id` integer NOT NULL,
	`recipient_id` integer NOT NULL,
	`content` text NOT NULL,
	`read` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `registration_codes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`minecraft_username` text NOT NULL,
	`minecraft_uuid` text NOT NULL,
	`used` integer DEFAULT false NOT NULL,
	`user_id` integer,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`used_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `registration_codes_code_unique` ON `registration_codes` (`code`);--> statement-breakpoint
CREATE TABLE `reported_content` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_type` text NOT NULL,
	`content_id` integer NOT NULL,
	`reporter_id` integer NOT NULL,
	`reason` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by` integer,
	`reviewed_at` integer,
	`review_notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `server_uptime_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`server_id` integer NOT NULL,
	`online` integer NOT NULL,
	`players_online` integer DEFAULT 0,
	`players_max` integer DEFAULT 0,
	`response_time_ms` integer,
	`checked_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `server_xp` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`server_id` integer NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`level` integer DEFAULT 0 NOT NULL,
	`playtime_seconds` integer DEFAULT 0,
	`last_synced_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `servers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`ip_address` text NOT NULL,
	`port` integer DEFAULT 25565 NOT NULL,
	`hide_port` integer DEFAULT false NOT NULL,
	`modpack_name` text,
	`bluemap_url` text,
	`curseforge_url` text,
	`status` text DEFAULT 'offline' NOT NULL,
	`players_online` integer DEFAULT 0 NOT NULL,
	`players_max` integer DEFAULT 0 NOT NULL,
	`version` text,
	`order_index` integer DEFAULT 0 NOT NULL,
	`api_key` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `servers_api_key_unique` ON `servers` (`api_key`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `setup_status` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`is_completed` integer DEFAULT false NOT NULL,
	`completed_at` integer,
	`admin_username` text,
	`version` text DEFAULT '4.0.0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text,
	`category` text DEFAULT 'general' NOT NULL,
	`description` text,
	`is_public` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_settings_key_unique` ON `site_settings` (`key`);--> statement-breakpoint
CREATE TABLE `social_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`content` text NOT NULL,
	`parent_comment_id` integer,
	`likes_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `social_posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `social_likes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`post_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`post_id`) REFERENCES `social_posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `social_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`content` text NOT NULL,
	`image_url` text,
	`likes_count` integer DEFAULT 0 NOT NULL,
	`comments_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_achievements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`achievement_id` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`completed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`achievement_id`) REFERENCES `achievements`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`email` text,
	`password` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`minecraft_username` text,
	`minecraft_uuid` text,
	`avatar` text,
	`bio` text,
	`preferred_background` text,
	`donation_rank_id` text,
	`rank_expires_at` integer,
	`rank_paused` integer DEFAULT false,
	`paused_rank_id` text,
	`paused_remaining_days` integer,
	`paused_at` integer,
	`total_donated` real DEFAULT 0,
	`stripe_customer_id` text,
	`stripe_subscription_id` text,
	`subscription_status` text,
	`donor_rank` text,
	`xp` integer DEFAULT 0 NOT NULL,
	`website_xp` integer DEFAULT 0 NOT NULL,
	`minecraft_xp` integer DEFAULT 0 NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`title` text,
	`email_verified` integer DEFAULT false,
	`two_factor_enabled` integer DEFAULT false,
	`two_factor_secret` text,
	`last_login_at` integer,
	`last_login_ip` text,
	`failed_login_attempts` integer DEFAULT 0,
	`locked_until` integer,
	`last_seen_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`donation_rank_id`) REFERENCES `donation_ranks`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_minecraft_username_unique` ON `users` (`minecraft_username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_minecraft_uuid_unique` ON `users` (`minecraft_uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_stripe_customer_id_unique` ON `users` (`stripe_customer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_stripe_subscription_id_unique` ON `users` (`stripe_subscription_id`);--> statement-breakpoint
CREATE TABLE `xp_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`source` text NOT NULL,
	`source_id` integer,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
