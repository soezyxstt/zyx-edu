CREATE TABLE `concept_localizations` (
	`id` text PRIMARY KEY NOT NULL,
	`concept_id` text NOT NULL,
	`lang` text NOT NULL,
	`display_name` text NOT NULL,
	`aliases` text NOT NULL,
	`technical_standard_term` text DEFAULT 'id' NOT NULL,
	`embedding` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`concept_id`) REFERENCES `concepts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_concept_loc_concept` ON `concept_localizations` (`concept_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_concept_loc_concept_lang` ON `concept_localizations` (`concept_id`,`lang`);--> statement-breakpoint
CREATE TABLE `concepts` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical_slug` text NOT NULL,
	`is_verified` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `concepts_canonical_slug_unique` ON `concepts` (`canonical_slug`);