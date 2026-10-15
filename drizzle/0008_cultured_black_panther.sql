CREATE TABLE `bookings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_key` text NOT NULL,
	`location_id` text NOT NULL,
	`location_name` text NOT NULL,
	`start_utc` integer NOT NULL,
	`duration_min` integer NOT NULL,
	`price` real,
	`booked_by` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`booked_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_match_key_unique` ON `bookings` (`match_key`);--> statement-breakpoint
CREATE TABLE `commitments` (
	`match_key` text NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`match_key`, `user_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`endpoint` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `run_matches` ADD `price` real;--> statement-breakpoint
ALTER TABLE `settings` ADD `vapid_public_key` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `vapid_private_key` text;