CREATE TABLE `studyset` (
	`studyset_uuid` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`username` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`favorited` integer NOT NULL,
	`cards` text NOT NULL,
	`categories` text NOT NULL,
	`labels` text NOT NULL,
	`metadata` text NOT NULL,
	`last_viewed` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `studyset_owner_created_idx` ON `studyset` (`owner_id`,`created_at`);