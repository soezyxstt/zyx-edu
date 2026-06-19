CREATE TABLE `flashcard_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`flashcard_id` text NOT NULL,
	`grade` integer NOT NULL,
	`response_time_ms` integer NOT NULL,
	`reviewed_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`flashcard_id`) REFERENCES `flashcards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_fc_reviews_student` ON `flashcard_reviews` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_fc_reviews_card` ON `flashcard_reviews` (`flashcard_id`);--> statement-breakpoint
CREATE TABLE `student_material_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`material_id` text NOT NULL,
	`completion_percent` integer DEFAULT 0 NOT NULL,
	`last_section_id` text,
	`time_spent_seconds` integer DEFAULT 0 NOT NULL,
	`last_opened_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`material_id`) REFERENCES `website_materials`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_student_mat_prog` ON `student_material_progress` (`student_id`,`material_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_student_material` ON `student_material_progress` (`student_id`,`material_id`);--> statement-breakpoint
ALTER TABLE `student_flashcard_progress` ADD `ease_factor` real DEFAULT 2.5 NOT NULL;--> statement-breakpoint
ALTER TABLE `student_flashcard_progress` ADD `interval_days` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `student_flashcard_progress` ADD `repetitions` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `student_flashcard_progress` ADD `lapses` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `student_flashcard_progress` ADD `due_date` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL;--> statement-breakpoint
ALTER TABLE `student_flashcard_progress` ADD `created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL;--> statement-breakpoint
ALTER TABLE `student_flashcard_progress` ADD `updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_student_fc_due` ON `student_flashcard_progress` (`student_id`,`due_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_student_flashcard` ON `student_flashcard_progress` (`student_id`,`flashcard_id`);