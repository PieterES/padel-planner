CREATE TABLE `week_overrides` (
	`user_id` integer NOT NULL,
	`week_start` text NOT NULL,
	`ranges` text NOT NULL,
	PRIMARY KEY(`user_id`, `week_start`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
