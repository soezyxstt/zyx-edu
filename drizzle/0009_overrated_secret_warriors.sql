CREATE TABLE `weekly_reflections` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`week_start` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_weekly_ref_student` ON `weekly_reflections` (`student_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_weekly_ref_student_week` ON `weekly_reflections` (`student_id`,`week_start`);