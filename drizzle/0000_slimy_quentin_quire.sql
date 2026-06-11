CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `ai_generation_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`tutor_id` text NOT NULL,
	`course_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`prompt_parameters` text NOT NULL,
	`target_count` integer NOT NULL,
	`generated_count` integer DEFAULT 0 NOT NULL,
	`token_usage` integer DEFAULT 0 NOT NULL,
	`error_message` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`tutor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_jobs_status` ON `ai_generation_jobs` (`course_id`,`status`);--> statement-breakpoint
CREATE TABLE `ai_material_instance_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`section_id` text NOT NULL,
	`chunk_text` text NOT NULL,
	`order_index` integer NOT NULL,
	`pinecone_vector_id` text NOT NULL,
	`is_synced` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `ai_material_instance_sections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_chunks_section` ON `ai_material_instance_chunks` (`section_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `ai_material_instance_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`material_instance_id` text NOT NULL,
	`title` text,
	`order_index` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`material_instance_id`) REFERENCES `ai_material_instances`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_sections_instance_idx` ON `ai_material_instance_sections` (`material_instance_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `ai_material_instances` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`title` text NOT NULL,
	`source_type` text NOT NULL,
	`summary` text NOT NULL,
	`learning_objectives` text NOT NULL,
	`keywords` text NOT NULL,
	`pinecone_sync_status` text DEFAULT 'pending' NOT NULL,
	`last_sync_error` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_instances_course_idx` ON `ai_material_instances` (`course_id`);--> statement-breakpoint
CREATE TABLE `ai_question_bank` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`source_section_id` text,
	`knowledge_object_id` text,
	`source_mtd_id` text,
	`source_mtd_version` integer,
	`generation_hash` text,
	`status` text DEFAULT 'active' NOT NULL,
	`difficulty` text DEFAULT 'medium' NOT NULL,
	`question_type` text DEFAULT 'multiple_choice' NOT NULL,
	`tags` text NOT NULL,
	`prompt` text NOT NULL,
	`options` text NOT NULL,
	`correct_indices` text NOT NULL,
	`explanation` text NOT NULL,
	`review_status` text DEFAULT 'generated' NOT NULL,
	`quality_score` real DEFAULT 1 NOT NULL,
	`use_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_section_id`) REFERENCES `ai_material_instance_sections`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`knowledge_object_id`) REFERENCES `knowledge_objects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`source_mtd_id`) REFERENCES `master_teaching_documents`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_qbank_selection` ON `ai_question_bank` (`course_id`,`review_status`,`difficulty`,`use_count`);--> statement-breakpoint
CREATE INDEX `idx_qbank_tags` ON `ai_question_bank` (`tags`);--> statement-breakpoint
CREATE INDEX `idx_qbank_ko` ON `ai_question_bank` (`knowledge_object_id`);--> statement-breakpoint
CREATE TABLE `ai_usage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`feature` text NOT NULL,
	`model` text NOT NULL,
	`tokens` integer DEFAULT 0 NOT NULL,
	`request_type` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_usage_user_created` ON `ai_usage_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`slot_id` text NOT NULL,
	`student_id` text NOT NULL,
	`course_id` text NOT NULL,
	`group_id` text NOT NULL,
	`booked_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`slot_id`) REFERENCES `tutor_slots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_slot_id_unique` ON `bookings` (`slot_id`);--> statement-breakpoint
CREATE INDEX `bookings_slot_idx` ON `bookings` (`slot_id`);--> statement-breakpoint
CREATE INDEX `bookings_student_idx` ON `bookings` (`student_id`);--> statement-breakpoint
CREATE INDEX `bookings_group_idx` ON `bookings` (`group_id`);--> statement-breakpoint
CREATE TABLE `chapters` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`order_index` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`asset_gen_status` text DEFAULT 'idle' NOT NULL,
	`asset_gen_flashcards_total` integer DEFAULT 0 NOT NULL,
	`asset_gen_flashcards_current` integer DEFAULT 0 NOT NULL,
	`asset_gen_questions_total` integer DEFAULT 0 NOT NULL,
	`asset_gen_questions_current` integer DEFAULT 0 NOT NULL,
	`asset_gen_error` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_chapters_course_order` ON `chapters` (`course_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `diktats` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`source_mtd_id` text NOT NULL,
	`source_mtd_version` integer NOT NULL,
	`is_stale` integer DEFAULT false NOT NULL,
	`generation_hash` text NOT NULL,
	`title` text NOT NULL,
	`file_url` text,
	`chapter_ids` text NOT NULL,
	`settings` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`download_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_mtd_id`) REFERENCES `master_teaching_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `drive_item` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`uploadthing_key` text,
	`ufs_url` text,
	`mime_type` text,
	`size_bytes` integer,
	`created_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `drive_item_parent_idx` ON `drive_item` (`parent_id`);--> statement-breakpoint
CREATE INDEX `drive_item_created_by_idx` ON `drive_item` (`created_by_user_id`);--> statement-breakpoint
CREATE TABLE `enrollment_token_courses` (
	`token_id` text NOT NULL,
	`course_id` text NOT NULL,
	FOREIGN KEY (`token_id`) REFERENCES `enrollment_tokens`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `token_courses_token_idx` ON `enrollment_token_courses` (`token_id`);--> statement-breakpoint
CREATE INDEX `token_courses_course_idx` ON `enrollment_token_courses` (`course_id`);--> statement-breakpoint
CREATE TABLE `enrollment_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`group_id` text NOT NULL,
	`capacity` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrollment_tokens_token_unique` ON `enrollment_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`course_id` text NOT NULL,
	`enrolled_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `exams` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`settings` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `flashcard_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`chapter_id` text NOT NULL,
	`source_mtd_id` text NOT NULL,
	`source_mtd_version` integer NOT NULL,
	`is_stale` integer DEFAULT false NOT NULL,
	`generation_hash` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_mtd_id`) REFERENCES `master_teaching_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `flashcards` (
	`id` text PRIMARY KEY NOT NULL,
	`set_id` text NOT NULL,
	`ko_id` text,
	`front` text NOT NULL,
	`back` text NOT NULL,
	`explanation` text,
	`status` text DEFAULT 'active' NOT NULL,
	`metadata` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`set_id`) REFERENCES `flashcard_sets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ko_id`) REFERENCES `knowledge_objects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `group_members` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`user_id` text NOT NULL,
	`joined_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `group_members_group_idx` ON `group_members` (`group_id`);--> statement-breakpoint
CREATE INDEX `group_members_user_idx` ON `group_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `knowledge_objects` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`mtd_id` text NOT NULL,
	`chapter_id` text NOT NULL,
	`concept_id` text NOT NULL,
	`learning_order` integer NOT NULL,
	`title` text NOT NULL,
	`concept_name` text NOT NULL,
	`content` text NOT NULL,
	`type` text NOT NULL,
	`difficulty` text DEFAULT 'medium' NOT NULL,
	`bloom_level` text NOT NULL,
	`tags` text NOT NULL,
	`importance` text DEFAULT 'medium' NOT NULL,
	`metadata` text NOT NULL,
	`pinecone_vector_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mtd_id`) REFERENCES `master_teaching_documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_ko_course` ON `knowledge_objects` (`course_id`);--> statement-breakpoint
CREATE INDEX `idx_ko_chapter` ON `knowledge_objects` (`chapter_id`);--> statement-breakpoint
CREATE INDEX `idx_ko_concept` ON `knowledge_objects` (`concept_id`);--> statement-breakpoint
CREATE INDEX `idx_ko_status` ON `knowledge_objects` (`status`);--> statement-breakpoint
CREATE TABLE `knowledge_relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`source_ko_id` text NOT NULL,
	`target_ko_id` text NOT NULL,
	`type` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`source_ko_id`) REFERENCES `knowledge_objects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_ko_id`) REFERENCES `knowledge_objects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_rel_source` ON `knowledge_relationships` (`source_ko_id`);--> statement-breakpoint
CREATE INDEX `idx_rel_target` ON `knowledge_relationships` (`target_ko_id`);--> statement-breakpoint
CREATE INDEX `idx_rel_source_target_type` ON `knowledge_relationships` (`source_ko_id`,`target_ko_id`,`type`);--> statement-breakpoint
CREATE TABLE `master_teaching_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`source_id` text,
	`title` text NOT NULL,
	`markdown_content` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by_id` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `drive_item`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `progress` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`material_id` text,
	`status` text DEFAULT 'completed',
	`completed_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`order` integer NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quiz_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`visibility` text DEFAULT 'free' NOT NULL,
	`time_limit_seconds` integer,
	`max_attempts` integer,
	`selection_rules` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_templates_search` ON `quiz_templates` (`course_id`,`category`,`visibility`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `student_chapter_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`chapter_id` text NOT NULL,
	`unlocked` integer DEFAULT false NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`completed_at` integer,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_student_chap_prog` ON `student_chapter_progress` (`student_id`,`chapter_id`);--> statement-breakpoint
CREATE TABLE `student_flashcard_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`flashcard_id` text NOT NULL,
	`box` integer DEFAULT 1 NOT NULL,
	`next_review_due` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`last_reviewed_at` integer,
	`history` text NOT NULL,
	`metadata` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`flashcard_id`) REFERENCES `flashcards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_student_fc_review` ON `student_flashcard_progress` (`student_id`,`next_review_due`);--> statement-breakpoint
CREATE TABLE `student_quiz_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`template_id` text NOT NULL,
	`score` integer,
	`duration_seconds` integer,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`questions_snapshot` text NOT NULL,
	`answers_snapshot` text,
	`started_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`submitted_at` integer,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `quiz_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_attempts_student` ON `student_quiz_attempts` (`student_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_attempts_completed` ON `student_quiz_attempts` (`template_id`,`score`) WHERE "status" = 'completed';--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`exam_id` text NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`score` integer,
	`teacher_notes` text,
	`submitted_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tutor_courses` (
	`id` text PRIMARY KEY NOT NULL,
	`tutor_id` text NOT NULL,
	`course_id` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`tutor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tutor_courses_tutor_idx` ON `tutor_courses` (`tutor_id`);--> statement-breakpoint
CREATE INDEX `tutor_courses_course_idx` ON `tutor_courses` (`course_id`);--> statement-breakpoint
CREATE TABLE `tutor_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`tutor_id` text NOT NULL,
	`day_of_week` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`tutor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tutor_slots_tutor_idx` ON `tutor_slots` (`tutor_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`role` text DEFAULT 'student',
	`last_activity_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `vector_sync_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`ko_id` text,
	`action` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ko_id`) REFERENCES `knowledge_objects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_vector_sync_status` ON `vector_sync_queue` (`status`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `website_material_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`material_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`canonical_markdown` text NOT NULL,
	`structured_content` text NOT NULL,
	`author_id` text,
	`change_summary` text,
	`is_ai_generated` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`material_id`) REFERENCES `website_materials`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_web_mat_ver_mat` ON `website_material_versions` (`material_id`);--> statement-breakpoint
CREATE TABLE `website_materials` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`chapter_id` text NOT NULL,
	`source_mtd_id` text NOT NULL,
	`source_mtd_version` integer NOT NULL,
	`is_stale` integer DEFAULT false NOT NULL,
	`generation_hash` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`canonical_markdown` text NOT NULL,
	`structured_content` text NOT NULL,
	`content_version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_mtd_id`) REFERENCES `master_teaching_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_web_mat_stale` ON `website_materials` (`is_stale`);--> statement-breakpoint
CREATE INDEX `idx_web_mat_chapter` ON `website_materials` (`chapter_id`);