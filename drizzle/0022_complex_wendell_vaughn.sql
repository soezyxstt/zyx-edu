CREATE TABLE `assessment_objects` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`source_mtd_id` text NOT NULL,
	`question_type` text NOT NULL,
	`difficulty` integer NOT NULL,
	`application_level` integer NOT NULL,
	`concepts` text NOT NULL,
	`pattern` text NOT NULL,
	`reasoning_type` text NOT NULL,
	`estimated_steps` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_mtd_id`) REFERENCES `master_teaching_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `assessment_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`application_level` integer NOT NULL,
	`difficulty_distribution` text NOT NULL,
	`common_patterns` text NOT NULL,
	`top_contexts` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assessment_profiles_course_id_unique` ON `assessment_profiles` (`course_id`);--> statement-breakpoint
CREATE TABLE `course_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`max_application_level` integer DEFAULT 2 NOT NULL,
	`max_estimated_steps` integer DEFAULT 4 NOT NULL,
	`max_reading_complexity` integer DEFAULT 2 NOT NULL,
	`allow_engineering_terms` integer DEFAULT true NOT NULL,
	`forbidden_contexts` text NOT NULL,
	`allowed_patterns` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `course_policies_course_id_unique` ON `course_policies` (`course_id`);--> statement-breakpoint
ALTER TABLE `ai_question_bank` ADD `is_stale` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `master_teaching_documents` ADD `type` text DEFAULT 'learning' NOT NULL;--> statement-breakpoint
ALTER TABLE `master_teaching_documents` ADD `source_hash` text;--> statement-breakpoint
ALTER TABLE `master_teaching_documents` ADD `derived_hash` text;--> statement-breakpoint
ALTER TABLE `vector_sync_queue` ADD `namespace` text DEFAULT 'learning' NOT NULL;