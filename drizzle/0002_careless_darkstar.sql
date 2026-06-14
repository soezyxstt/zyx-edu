CREATE TABLE `learning_events` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`course_id` text NOT NULL,
	`concept_name` text,
	`ko_id` text,
	`event_type` text NOT NULL,
	`correctness` real,
	`weight` real DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ko_id`) REFERENCES `knowledge_objects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_le_student_course_created` ON `learning_events` (`student_id`,`course_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_le_student_concept` ON `learning_events` (`student_id`,`concept_name`);--> statement-breakpoint
CREATE TABLE `student_concept_mastery` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`course_id` text NOT NULL,
	`concept_name` text NOT NULL,
	`mastery_score` integer NOT NULL,
	`confidence` integer NOT NULL,
	`evidence_count` integer NOT NULL,
	`trend` text,
	`last_evidence_at` integer NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_scm_student_course_score` ON `student_concept_mastery` (`student_id`,`course_id`,`mastery_score`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_scm_student_course_concept` ON `student_concept_mastery` (`student_id`,`course_id`,`concept_name`);--> statement-breakpoint
CREATE TABLE `student_concept_mastery_history` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`course_id` text NOT NULL,
	`concept_name` text NOT NULL,
	`mastery_score` integer NOT NULL,
	`confidence` integer NOT NULL,
	`snapshot_date` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_scmh_student_course` ON `student_concept_mastery_history` (`student_id`,`course_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_scmh_student_concept_date` ON `student_concept_mastery_history` (`student_id`,`concept_name`,`snapshot_date`);