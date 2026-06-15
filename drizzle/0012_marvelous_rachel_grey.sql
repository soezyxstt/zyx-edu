CREATE TABLE `ai_extraction_failures` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text,
	`chapter_id` text,
	`step` text NOT NULL,
	`raw_output` text NOT NULL,
	`error_message` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_ai_fail_course` ON `ai_extraction_failures` (`course_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_fail_chapter` ON `ai_extraction_failures` (`chapter_id`);