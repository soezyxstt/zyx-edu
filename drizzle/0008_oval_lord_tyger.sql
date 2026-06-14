CREATE TABLE `live_quiz_results` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`student_id` text NOT NULL,
	`course_id` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`rank` integer,
	`answers_snapshot` text NOT NULL,
	`completed_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `live_quiz_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_live_results_session` ON `live_quiz_results` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_live_results_student` ON `live_quiz_results` (`student_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_live_result_session_student` ON `live_quiz_results` (`session_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `live_quiz_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`tutor_id` text NOT NULL,
	`template_id` text,
	`code` text NOT NULL,
	`state` text DEFAULT 'lobby' NOT NULL,
	`questions_snapshot` text NOT NULL,
	`participant_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`ended_at` integer,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tutor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `quiz_templates`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `live_quiz_sessions_code_unique` ON `live_quiz_sessions` (`code`);--> statement-breakpoint
CREATE INDEX `idx_live_sessions_code` ON `live_quiz_sessions` (`code`);--> statement-breakpoint
CREATE INDEX `idx_live_sessions_course` ON `live_quiz_sessions` (`course_id`);