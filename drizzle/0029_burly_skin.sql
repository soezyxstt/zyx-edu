CREATE TABLE `content_quality_flags` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`question_id` text NOT NULL,
	`flag_type` text NOT NULL,
	`detail` text NOT NULL,
	`sample_size` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `ai_question_bank`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_cqf_course` ON `content_quality_flags` (`course_id`);--> statement-breakpoint
CREATE INDEX `idx_cqf_question` ON `content_quality_flags` (`question_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_cqf_question_type` ON `content_quality_flags` (`question_id`,`flag_type`);