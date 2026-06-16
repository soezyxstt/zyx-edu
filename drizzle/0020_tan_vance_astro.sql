CREATE TABLE `course_materials` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`file_url` text NOT NULL,
	`chapter_ids` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_course_materials_course` ON `course_materials` (`course_id`);--> statement-breakpoint
ALTER TABLE `ai_material_instances` ADD `chapter_ids` text DEFAULT '[]' NOT NULL;