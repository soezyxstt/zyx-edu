CREATE TABLE `daily_recommendations` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	`completed_items` text NOT NULL,
	`generated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_daily_rec_student` ON `daily_recommendations` (`student_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_daily_rec_student_date` ON `daily_recommendations` (`student_id`,`date`);--> statement-breakpoint
CREATE TABLE `student_streaks` (
	`student_id` text PRIMARY KEY NOT NULL,
	`current_streak` integer DEFAULT 0 NOT NULL,
	`longest_streak` integer DEFAULT 0 NOT NULL,
	`last_active_date` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
