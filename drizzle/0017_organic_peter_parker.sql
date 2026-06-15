CREATE TABLE `concept_graph_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`source_concept` text NOT NULL,
	`target_concept` text NOT NULL,
	`type` text NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_cge_course` ON `concept_graph_edges` (`course_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_cge_edge` ON `concept_graph_edges` (`course_id`,`source_concept`,`target_concept`,`type`);