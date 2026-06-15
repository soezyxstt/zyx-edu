CREATE TABLE `question_option_stats` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`course_id` text NOT NULL,
	`option_index` integer NOT NULL,
	`selected_count` integer DEFAULT 0 NOT NULL,
	`total_attempts` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `ai_question_bank`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_qos_question` ON `question_option_stats` (`question_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_qos_question_option` ON `question_option_stats` (`question_id`,`option_index`);--> statement-breakpoint
CREATE TABLE `tutor_chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`course_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`sources` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tcm_student_course` ON `tutor_chat_messages` (`student_id`,`course_id`);--> statement-breakpoint
CREATE INDEX `idx_tcm_created_at` ON `tutor_chat_messages` (`created_at`);--> statement-breakpoint
ALTER TABLE `ai_question_bank` ADD `distractor_map` text;