CREATE TABLE `learning_outcome_concepts` (
	`id` text PRIMARY KEY NOT NULL,
	`learning_outcome_id` text NOT NULL,
	`concept_id` text NOT NULL,
	FOREIGN KEY (`learning_outcome_id`) REFERENCES `learning_outcomes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`concept_id`) REFERENCES `concepts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_lo_concepts_lo` ON `learning_outcome_concepts` (`learning_outcome_id`);--> statement-breakpoint
CREATE INDEX `idx_lo_concepts_concept` ON `learning_outcome_concepts` (`concept_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_lo_concepts` ON `learning_outcome_concepts` (`learning_outcome_id`,`concept_id`);--> statement-breakpoint
CREATE TABLE `learning_outcomes` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`level` text NOT NULL,
	`parent_id` text,
	`code` text NOT NULL,
	`description` text NOT NULL,
	`bloom_target` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `learning_outcomes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_learning_outcomes_course` ON `learning_outcomes` (`course_id`);--> statement-breakpoint
CREATE INDEX `idx_learning_outcomes_parent` ON `learning_outcomes` (`parent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_learning_outcomes_course_code` ON `learning_outcomes` (`course_id`,`code`);