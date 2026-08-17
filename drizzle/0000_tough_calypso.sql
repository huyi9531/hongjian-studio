CREATE TABLE `generation_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`work_id` text NOT NULL,
	`input_fingerprint` text NOT NULL,
	`model` text NOT NULL,
	`size` text NOT NULL,
	`prompt_mode` text NOT NULL,
	`status` text NOT NULL,
	`completed_pages` integer DEFAULT 0 NOT NULL,
	`failed_pages` integer DEFAULT 0 NOT NULL,
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `generation_jobs_work_id_unique` ON `generation_jobs` (`work_id`);--> statement-breakpoint
CREATE TABLE `publications` (
	`id` text PRIMARY KEY NOT NULL,
	`work_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`h5_url` text NOT NULL,
	`qr_code` text NOT NULL,
	`transfer_to_oss` integer NOT NULL,
	`service_fee` text,
	`currency` text,
	`transaction_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `publication_fingerprint` ON `publications` (`work_id`,`fingerprint`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `work_images` (
	`id` text PRIMARY KEY NOT NULL,
	`work_id` text NOT NULL,
	`page_index` integer NOT NULL,
	`source_url` text,
	`archive_path` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`error` text,
	`input_fingerprint` text,
	`archive_status` text DEFAULT 'unavailable' NOT NULL,
	`archive_error` text,
	`archive_mime_type` text,
	`public_url_status` text DEFAULT 'unknown' NOT NULL,
	`public_url_checked_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `work_images_work_page` ON `work_images` (`work_id`,`page_index`);--> statement-breakpoint
CREATE TABLE `work_references` (
	`id` text PRIMARY KEY NOT NULL,
	`work_id` text NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`archive_path` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `works` (
	`id` text PRIMARY KEY NOT NULL,
	`topic` text NOT NULL,
	`outline_raw` text DEFAULT '' NOT NULL,
	`outline_pages` text DEFAULT '[]' NOT NULL,
	`titles` text DEFAULT '[]' NOT NULL,
	`selected_title` text DEFAULT '' NOT NULL,
	`copywriting` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
