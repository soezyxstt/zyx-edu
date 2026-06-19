DROP INDEX `idx_student_fc_review`;--> statement-breakpoint
ALTER TABLE `student_flashcard_progress` DROP COLUMN `box`;--> statement-breakpoint
ALTER TABLE `student_flashcard_progress` DROP COLUMN `next_review_due`;--> statement-breakpoint
ALTER TABLE `student_flashcard_progress` DROP COLUMN `history`;--> statement-breakpoint
ALTER TABLE `student_flashcard_progress` DROP COLUMN `metadata`;--> statement-breakpoint
ALTER TABLE `student_material_progress` ADD `last_position` text;