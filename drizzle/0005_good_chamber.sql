CREATE TABLE `attempt_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`attempt_id` text NOT NULL,
	`question_index` integer NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`attempt_id`) REFERENCES `student_quiz_attempts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_attempt_feedback_question` ON `attempt_feedback` (`attempt_id`,`question_index`);--> statement-breakpoint
CREATE TABLE `interventions` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`course_id` text NOT NULL,
	`concept_name` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`resolved_at` integer,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_active_intervention` ON `interventions` (`student_id`,`concept_name`) WHERE "status" = 'active';--> statement-breakpoint
ALTER TABLE `student_quiz_attempts` ADD `strong_areas` text;--> statement-breakpoint
ALTER TABLE `student_quiz_attempts` ADD `weak_areas` text;--> statement-breakpoint
ALTER TABLE `student_quiz_attempts` ADD `recommended_next_steps` text;