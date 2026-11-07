ALTER TABLE `studyset` ADD `subject` text;--> statement-breakpoint
ALTER TABLE `studyset` ADD `is_public` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `studyset` ADD `published_at` integer;--> statement-breakpoint
ALTER TABLE `studyset` ADD `featured_at` integer;--> statement-breakpoint
ALTER TABLE `studyset` ADD `hidden_at` integer;--> statement-breakpoint
ALTER TABLE `studyset` ADD `save_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `studyset` ADD `copied_from` text;--> statement-breakpoint
CREATE INDEX `studyset_published_idx` ON `studyset` (`published_at`,`studyset_uuid`);--> statement-breakpoint
CREATE INDEX `studyset_featured_idx` ON `studyset` (`featured_at`);--> statement-breakpoint
CREATE INDEX `studyset_hidden_idx` ON `studyset` (`hidden_at`);--> statement-breakpoint
CREATE INDEX `studyset_save_count_idx` ON `studyset` (`save_count`);