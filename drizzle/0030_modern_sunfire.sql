CREATE TABLE `career_path_concepts` (
	`id` text PRIMARY KEY NOT NULL,
	`career_path_template_id` text NOT NULL,
	`concept_id` text NOT NULL,
	FOREIGN KEY (`career_path_template_id`) REFERENCES `career_path_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`concept_id`) REFERENCES `concepts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_career_path_concepts_template` ON `career_path_concepts` (`career_path_template_id`);--> statement-breakpoint
CREATE INDEX `idx_career_path_concepts_concept` ON `career_path_concepts` (`concept_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_career_path_concepts` ON `career_path_concepts` (`career_path_template_id`,`concept_id`);--> statement-breakpoint
CREATE TABLE `career_path_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_career_path_templates_title` ON `career_path_templates` (`title`);