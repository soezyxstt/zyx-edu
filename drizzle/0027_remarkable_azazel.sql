CREATE TABLE `chat_message_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`relevance_score` real DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `tutor_chat_messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_cms_message` ON `chat_message_sources` (`message_id`);--> statement-breakpoint
CREATE INDEX `idx_cms_source` ON `chat_message_sources` (`source_type`,`source_id`);--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`course_id` text NOT NULL,
	`title` text NOT NULL,
	`started_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`last_message_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_chat_sessions_student_course` ON `chat_sessions` (`student_id`,`course_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_sessions_last_message` ON `chat_sessions` (`last_message_at`);--> statement-breakpoint
ALTER TABLE `tutor_chat_messages` ADD `session_id` text NOT NULL REFERENCES chat_sessions(id);--> statement-breakpoint
CREATE INDEX `idx_tcm_session` ON `tutor_chat_messages` (`session_id`);