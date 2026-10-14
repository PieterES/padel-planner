DROP TABLE `posted_matches`;--> statement-breakpoint
ALTER TABLE `scrape_runs` DROP COLUMN `posted_count`;--> statement-breakpoint
ALTER TABLE `settings` DROP COLUMN `top_n_posted`;--> statement-breakpoint
ALTER TABLE `settings` DROP COLUMN `wa_group_jid`;