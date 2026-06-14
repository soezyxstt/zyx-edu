CREATE TABLE `study_paths` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`course_id` text NOT NULL,
	`path_json` text NOT NULL,
	`computed_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_study_paths_student` ON `study_paths` (`student_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_study_paths_student_course` ON `study_paths` (`student_id`,`course_id`);