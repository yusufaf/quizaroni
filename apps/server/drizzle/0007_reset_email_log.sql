CREATE TABLE `reset_email_log` (
	`id` text PRIMARY KEY NOT NULL,
	`recipient` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reset_email_log_recipient_idx` ON `reset_email_log` (`recipient`,`created_at`);