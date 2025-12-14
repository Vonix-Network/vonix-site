CREATE TABLE `password_reset_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_reset_tokens_token_unique` ON `password_reset_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`subject` text NOT NULL,
	`category` text DEFAULT 'general' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`assigned_to` integer,
	`discord_thread_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`closed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `ticket_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_id` integer NOT NULL,
	`user_id` integer,
	`message` text NOT NULL,
	`is_staff_reply` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
ALTER TABLE `donation_ranks` ADD `square_subscription_plan_id` text;--> statement-breakpoint
ALTER TABLE `donation_ranks` ADD `square_subscription_plan_variation_id` text;--> statement-breakpoint
ALTER TABLE `donation_ranks` ADD `discord_role_id` text;--> statement-breakpoint
ALTER TABLE `servers` ADD `pterodactyl_server_id` text;--> statement-breakpoint
ALTER TABLE `servers` ADD `pterodactyl_panel_url` text;--> statement-breakpoint
ALTER TABLE `users` ADD `discord_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `discord_username` text;--> statement-breakpoint
ALTER TABLE `users` ADD `discord_avatar` text;--> statement-breakpoint
ALTER TABLE `users` ADD `square_customer_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `square_subscription_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `square_card_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_discord_id_unique` ON `users` (`discord_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_square_customer_id_unique` ON `users` (`square_customer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_square_subscription_id_unique` ON `users` (`square_subscription_id`);