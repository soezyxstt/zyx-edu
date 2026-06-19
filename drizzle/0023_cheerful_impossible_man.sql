-- Disable foreign key constraints during table reconstruction
PRAGMA foreign_keys=OFF;--> statement-breakpoint

CREATE TABLE `assessment_object_concepts` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_object_id` text NOT NULL,
	`concept_id` text NOT NULL,
	FOREIGN KEY (`assessment_object_id`) REFERENCES `assessment_objects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`concept_id`) REFERENCES `concepts`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `idx_ao_concepts_ao` ON `assessment_object_concepts` (`assessment_object_id`);--> statement-breakpoint
CREATE INDEX `idx_ao_concepts_concept` ON `assessment_object_concepts` (`concept_id`);--> statement-breakpoint
CREATE TABLE `assessment_object_kos` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_object_id` text NOT NULL,
	`ko_id` text NOT NULL,
	FOREIGN KEY (`assessment_object_id`) REFERENCES `assessment_objects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ko_id`) REFERENCES `knowledge_objects`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `idx_ao_kos_ao` ON `assessment_object_kos` (`assessment_object_id`);--> statement-breakpoint
CREATE INDEX `idx_ao_kos_ko` ON `assessment_object_kos` (`ko_id`);--> statement-breakpoint
CREATE TABLE `assessment_source_chapters` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_source_id` text NOT NULL,
	`chapter_id` text NOT NULL,
	FOREIGN KEY (`assessment_source_id`) REFERENCES `assessment_sources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `idx_asc_source` ON `assessment_source_chapters` (`assessment_source_id`);--> statement-breakpoint
CREATE INDEX `idx_asc_chapter` ON `assessment_source_chapters` (`chapter_id`);--> statement-breakpoint
CREATE TABLE `assessment_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`title` text NOT NULL,
	`origin` text DEFAULT 'uploaded' NOT NULL,
	`category` text NOT NULL,
	`year` integer NOT NULL,
	`semester` integer,
	`source_markdown` text NOT NULL,
	`source_hash` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`parser_version` text DEFAULT '1.0.0' NOT NULL,
	`ingestion_status` text DEFAULT 'pending' NOT NULL,
	`ingestion_error` text,
	`ingestion_started_at` integer,
	`ingestion_completed_at` integer,
	`original_filename` text,
	`uploadthing_key` text,
	`uploaded_by_user_id` text NOT NULL,
	`deleted_at` integer,
	`deleted_by_user_id` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deleted_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE TABLE `chapter_aliases` (
	`id` text PRIMARY KEY NOT NULL,
	`chapter_id` text NOT NULL,
	`alias_name` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `chapter_aliases_alias_name_unique` ON `chapter_aliases` (`alias_name`);--> statement-breakpoint

-- Recreate assessment_objects to safely change its columns and update foreign keys
CREATE TABLE `assessment_objects_new` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`question_order` integer NOT NULL,
	`source_question_number` text,
	`question_type` text NOT NULL,
	`difficulty` integer NOT NULL,
	`application_level` integer NOT NULL,
	`pattern` text NOT NULL,
	`reasoning_type` text NOT NULL,
	`estimated_steps` integer NOT NULL,
	`question_markdown` text DEFAULT '' NOT NULL,
	`answer_markdown` text,
	`options` text,
	`canonical_question_hash` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `assessment_sources`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint

-- Copy data from old to new (mapping source_mtd_id to source_id, supplying defaults for new columns)
INSERT INTO `assessment_objects_new` (
	id, source_id, question_order, source_question_number, question_type,
	difficulty, application_level, pattern, reasoning_type, estimated_steps,
	question_markdown, answer_markdown, options, canonical_question_hash,
	created_at, updated_at
)
SELECT 
	id, source_mtd_id, 0, NULL, question_type,
	difficulty, application_level, pattern, reasoning_type, estimated_steps,
	'', NULL, NULL, '',
	created_at, updated_at
FROM `assessment_objects`;--> statement-breakpoint

DROP TABLE `assessment_objects`;--> statement-breakpoint
ALTER TABLE `assessment_objects_new` RENAME TO `assessment_objects`;--> statement-breakpoint

ALTER TABLE `ai_question_bank` ADD `styled_after_assessment_object_id` text REFERENCES assessment_objects(id);--> statement-breakpoint
ALTER TABLE `ai_question_bank` ADD `pattern` text;--> statement-breakpoint
ALTER TABLE `ai_question_bank` ADD `reasoning_type` text;--> statement-breakpoint
ALTER TABLE `ai_question_bank` ADD `application_level` integer;--> statement-breakpoint
ALTER TABLE `ai_question_bank` ADD `estimated_steps` integer;--> statement-breakpoint
ALTER TABLE `master_teaching_documents` ADD `original_pdf_key` text;--> statement-breakpoint
ALTER TABLE `master_teaching_documents` ADD `canonical_markdown_key` text;--> statement-breakpoint
ALTER TABLE `website_materials` ADD `coverage_status` text DEFAULT 'not_verified' NOT NULL;--> statement-breakpoint
ALTER TABLE `website_materials` ADD `coverage_report` text NOT NULL;--> statement-breakpoint

PRAGMA foreign_keys=ON;