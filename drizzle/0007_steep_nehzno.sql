CREATE TABLE `course_analytics_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_course_snapshot_lookup` ON `course_analytics_snapshots` (`course_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_course_snapshot_date` ON `course_analytics_snapshots` (`course_id`,`date`);