CREATE TABLE `availability_exceptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`date` text NOT NULL,
	`start_min` integer,
	`end_min` integer,
	`kind` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `availability_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`weekday` integer NOT NULL,
	`start_min` integer NOT NULL,
	`end_min` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `courts` (
	`id` text PRIMARY KEY NOT NULL,
	`location_id` text NOT NULL,
	`location_name` text NOT NULL,
	`name` text NOT NULL,
	`indoor` integer,
	`kind` text,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `posted_matches` (
	`key` text PRIMARY KEY NOT NULL,
	`players_sig` text NOT NULL,
	`posted_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scrape_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trigger` text NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`slot_count` integer,
	`match_count` integer,
	`posted_count` integer,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`indoor_outdoor` text NOT NULL,
	`durations` text NOT NULL,
	`windows` text NOT NULL,
	`min_players` integer NOT NULL,
	`horizon_days` integer NOT NULL,
	`top_n_posted` integer NOT NULL,
	`wa_group_jid` text
);
--> statement-breakpoint
CREATE TABLE `slots` (
	`court_id` text NOT NULL,
	`start_utc` integer NOT NULL,
	`duration_min` integer NOT NULL,
	`price` real,
	`run_id` integer NOT NULL,
	PRIMARY KEY(`court_id`, `start_utc`, `duration_min`),
	FOREIGN KEY (`court_id`) REFERENCES `courts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`magic_token` text NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_magic_token_unique` ON `users` (`magic_token`);