CREATE TABLE `ai_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`request_key` text NOT NULL,
	`period` text NOT NULL,
	`status` text NOT NULL,
	`reserve_micro` integer NOT NULL,
	`result_json` text,
	`input_tokens` integer,
	`output_tokens` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_owner_key_idx` ON `ai_requests` (`owner_id`,`request_key`);--> statement-breakpoint
CREATE INDEX `ai_owner_period_idx` ON `ai_requests` (`owner_id`,`period`);--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `visitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `comments_post_idx` ON `comments` (`post_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `comments_owner_idx` ON `comments` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`capacity` integer NOT NULL,
	`is_test` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `likes` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`owner_id` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `visitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `likes_post_owner_idx` ON `likes` (`post_id`,`owner_id`);--> statement-breakpoint
CREATE INDEX `likes_owner_idx` ON `likes` (`owner_id`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`tag` text NOT NULL,
	`body` text NOT NULL,
	`hidden` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `visitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `posts_feed_idx` ON `posts` (`hidden`,`created_at`);--> statement-breakpoint
CREATE INDEX `posts_owner_idx` ON `posts` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `visitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_event_owner_idx` ON `registrations` (`event_id`,`owner_id`);--> statement-breakpoint
CREATE INDEX `registrations_owner_idx` ON `registrations` (`owner_id`);--> statement-breakpoint
CREATE INDEX `registrations_capacity_idx` ON `registrations` (`event_id`,`status`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `visitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reports_post_owner_idx` ON `reports` (`post_id`,`owner_id`);--> statement-breakpoint
CREATE INDEX `reports_owner_idx` ON `reports` (`owner_id`);--> statement-breakpoint
CREATE TABLE `visitors` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`state_json` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `visitors_token_hash_unique` ON `visitors` (`token_hash`);
