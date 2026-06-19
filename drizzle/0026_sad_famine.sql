CREATE TABLE `mastery_recompute_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`course_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reason` text NOT NULL,
	`retries` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_mrq_status` ON `mastery_recompute_queue` (`status`);--> statement-breakpoint
CREATE INDEX `idx_mrq_student_course` ON `mastery_recompute_queue` (`student_id`,`course_id`);--> statement-breakpoint
CREATE TABLE `student_chapter_mastery` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`course_id` text NOT NULL,
	`chapter_id` text NOT NULL,
	`mastery_score` integer NOT NULL,
	`confidence` real NOT NULL,
	`evidence_count` integer NOT NULL,
	`trend` text,
	`last_evidence_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_scm_student_chapter_course` ON `student_chapter_mastery` (`student_id`,`course_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_scm_student_chapter` ON `student_chapter_mastery` (`student_id`,`chapter_id`);