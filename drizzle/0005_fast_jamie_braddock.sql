CREATE TABLE `run_matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` integer NOT NULL,
	`rank` integer NOT NULL,
	`location_id` text NOT NULL,
	`location_name` text NOT NULL,
	`start_utc` integer NOT NULL,
	`duration_min` integer NOT NULL,
	`courts` text NOT NULL,
	`players` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `scrape_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
