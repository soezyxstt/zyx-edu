DROP INDEX "account_userId_idx";--> statement-breakpoint
DROP INDEX "idx_ai_fail_course";--> statement-breakpoint
DROP INDEX "idx_ai_fail_chapter";--> statement-breakpoint
DROP INDEX "idx_jobs_status";--> statement-breakpoint
DROP INDEX "idx_chunks_section";--> statement-breakpoint
DROP INDEX "ai_sections_instance_idx";--> statement-breakpoint
DROP INDEX "ai_instances_course_idx";--> statement-breakpoint
DROP INDEX "idx_qbank_selection";--> statement-breakpoint
DROP INDEX "idx_qbank_tags";--> statement-breakpoint
DROP INDEX "idx_qbank_ko";--> statement-breakpoint
DROP INDEX "idx_usage_user_created";--> statement-breakpoint
DROP INDEX "uq_attempt_feedback_question";--> statement-breakpoint
DROP INDEX "bookings_slot_id_unique";--> statement-breakpoint
DROP INDEX "bookings_slot_idx";--> statement-breakpoint
DROP INDEX "bookings_student_idx";--> statement-breakpoint
DROP INDEX "bookings_group_idx";--> statement-breakpoint
DROP INDEX "idx_chapters_course_order";--> statement-breakpoint
DROP INDEX "idx_cge_course";--> statement-breakpoint
DROP INDEX "uq_cge_edge";--> statement-breakpoint
DROP INDEX "idx_concept_loc_concept";--> statement-breakpoint
DROP INDEX "uq_concept_loc_concept_lang";--> statement-breakpoint
DROP INDEX "concepts_canonical_slug_unique";--> statement-breakpoint
DROP INDEX "idx_course_snapshot_lookup";--> statement-breakpoint
DROP INDEX "uq_course_snapshot_date";--> statement-breakpoint
DROP INDEX "idx_course_materials_course";--> statement-breakpoint
DROP INDEX "idx_daily_rec_student";--> statement-breakpoint
DROP INDEX "uq_daily_rec_student_date";--> statement-breakpoint
DROP INDEX "drive_item_parent_idx";--> statement-breakpoint
DROP INDEX "drive_item_created_by_idx";--> statement-breakpoint
DROP INDEX "token_courses_token_idx";--> statement-breakpoint
DROP INDEX "token_courses_course_idx";--> statement-breakpoint
DROP INDEX "enrollment_tokens_token_unique";--> statement-breakpoint
DROP INDEX "group_members_group_idx";--> statement-breakpoint
DROP INDEX "group_members_user_idx";--> statement-breakpoint
DROP INDEX "uq_active_intervention";--> statement-breakpoint
DROP INDEX "idx_ko_course";--> statement-breakpoint
DROP INDEX "idx_ko_chapter";--> statement-breakpoint
DROP INDEX "idx_ko_concept";--> statement-breakpoint
DROP INDEX "idx_ko_status";--> statement-breakpoint
DROP INDEX "idx_rel_source";--> statement-breakpoint
DROP INDEX "idx_rel_target";--> statement-breakpoint
DROP INDEX "idx_rel_source_target_type";--> statement-breakpoint
DROP INDEX "idx_le_student_course_created";--> statement-breakpoint
DROP INDEX "idx_le_student_concept";--> statement-breakpoint
DROP INDEX "idx_live_results_session";--> statement-breakpoint
DROP INDEX "idx_live_results_student";--> statement-breakpoint
DROP INDEX "uq_live_result_session_student";--> statement-breakpoint
DROP INDEX "live_quiz_sessions_code_unique";--> statement-breakpoint
DROP INDEX "idx_live_sessions_code";--> statement-breakpoint
DROP INDEX "idx_live_sessions_course";--> statement-breakpoint
DROP INDEX "idx_notifications_user_read";--> statement-breakpoint
DROP INDEX "idx_notifications_user_created";--> statement-breakpoint
DROP INDEX "idx_qos_question";--> statement-breakpoint
DROP INDEX "uq_qos_question_option";--> statement-breakpoint
DROP INDEX "idx_templates_search";--> statement-breakpoint
DROP INDEX "session_token_unique";--> statement-breakpoint
DROP INDEX "session_userId_idx";--> statement-breakpoint
DROP INDEX "idx_student_chap_prog";--> statement-breakpoint
DROP INDEX "idx_scm_student_course_score";--> statement-breakpoint
DROP INDEX "uq_scm_student_course_concept";--> statement-breakpoint
DROP INDEX "idx_scmh_student_course";--> statement-breakpoint
DROP INDEX "uq_scmh_student_concept_date";--> statement-breakpoint
DROP INDEX "idx_student_fc_review";--> statement-breakpoint
DROP INDEX "idx_attempts_student";--> statement-breakpoint
DROP INDEX "idx_attempts_completed";--> statement-breakpoint
DROP INDEX "idx_study_paths_student";--> statement-breakpoint
DROP INDEX "uq_study_paths_student_course";--> statement-breakpoint
DROP INDEX "idx_tcm_student_course";--> statement-breakpoint
DROP INDEX "idx_tcm_created_at";--> statement-breakpoint
DROP INDEX "tutor_courses_tutor_idx";--> statement-breakpoint
DROP INDEX "tutor_courses_course_idx";--> statement-breakpoint
DROP INDEX "uq_tss_student_course";--> statement-breakpoint
DROP INDEX "tutor_slots_tutor_idx";--> statement-breakpoint
DROP INDEX "user_email_unique";--> statement-breakpoint
DROP INDEX "user_push_tokens_token_unique";--> statement-breakpoint
DROP INDEX "idx_push_tokens_user";--> statement-breakpoint
DROP INDEX "idx_push_tokens_token";--> statement-breakpoint
DROP INDEX "idx_vector_sync_status";--> statement-breakpoint
DROP INDEX "verification_identifier_idx";--> statement-breakpoint
DROP INDEX "idx_web_mat_ver_mat";--> statement-breakpoint
DROP INDEX "idx_web_mat_stale";--> statement-breakpoint
DROP INDEX "idx_web_mat_chapter";--> statement-breakpoint
DROP INDEX "idx_weekly_ref_student";--> statement-breakpoint
DROP INDEX "uq_weekly_ref_student_week";--> statement-breakpoint
ALTER TABLE `ai_material_instances` ALTER COLUMN "chapter_ids" TO "chapter_ids" text;--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_fail_course` ON `ai_extraction_failures` (`course_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_fail_chapter` ON `ai_extraction_failures` (`chapter_id`);--> statement-breakpoint
CREATE INDEX `idx_jobs_status` ON `ai_generation_jobs` (`course_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_chunks_section` ON `ai_material_instance_chunks` (`section_id`,`order_index`);--> statement-breakpoint
CREATE INDEX `ai_sections_instance_idx` ON `ai_material_instance_sections` (`material_instance_id`,`order_index`);--> statement-breakpoint
CREATE INDEX `ai_instances_course_idx` ON `ai_material_instances` (`course_id`);--> statement-breakpoint
CREATE INDEX `idx_qbank_selection` ON `ai_question_bank` (`course_id`,`review_status`,`difficulty`,`use_count`);--> statement-breakpoint
CREATE INDEX `idx_qbank_tags` ON `ai_question_bank` (`tags`);--> statement-breakpoint
CREATE INDEX `idx_qbank_ko` ON `ai_question_bank` (`knowledge_object_id`);--> statement-breakpoint
CREATE INDEX `idx_usage_user_created` ON `ai_usage_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_attempt_feedback_question` ON `attempt_feedback` (`attempt_id`,`question_index`);--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_slot_id_unique` ON `bookings` (`slot_id`);--> statement-breakpoint
CREATE INDEX `bookings_slot_idx` ON `bookings` (`slot_id`);--> statement-breakpoint
CREATE INDEX `bookings_student_idx` ON `bookings` (`student_id`);--> statement-breakpoint
CREATE INDEX `bookings_group_idx` ON `bookings` (`group_id`);--> statement-breakpoint
CREATE INDEX `idx_chapters_course_order` ON `chapters` (`course_id`,`order_index`);--> statement-breakpoint
CREATE INDEX `idx_cge_course` ON `concept_graph_edges` (`course_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_cge_edge` ON `concept_graph_edges` (`course_id`,`source_concept`,`target_concept`,`type`);--> statement-breakpoint
CREATE INDEX `idx_concept_loc_concept` ON `concept_localizations` (`concept_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_concept_loc_concept_lang` ON `concept_localizations` (`concept_id`,`lang`);--> statement-breakpoint
CREATE UNIQUE INDEX `concepts_canonical_slug_unique` ON `concepts` (`canonical_slug`);--> statement-breakpoint
CREATE INDEX `idx_course_snapshot_lookup` ON `course_analytics_snapshots` (`course_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_course_snapshot_date` ON `course_analytics_snapshots` (`course_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_course_materials_course` ON `course_materials` (`course_id`);--> statement-breakpoint
CREATE INDEX `idx_daily_rec_student` ON `daily_recommendations` (`student_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_daily_rec_student_date` ON `daily_recommendations` (`student_id`,`date`);--> statement-breakpoint
CREATE INDEX `drive_item_parent_idx` ON `drive_item` (`parent_id`);--> statement-breakpoint
CREATE INDEX `drive_item_created_by_idx` ON `drive_item` (`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `token_courses_token_idx` ON `enrollment_token_courses` (`token_id`);--> statement-breakpoint
CREATE INDEX `token_courses_course_idx` ON `enrollment_token_courses` (`course_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `enrollment_tokens_token_unique` ON `enrollment_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `group_members_group_idx` ON `group_members` (`group_id`);--> statement-breakpoint
CREATE INDEX `group_members_user_idx` ON `group_members` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_active_intervention` ON `interventions` (`student_id`,`concept_name`) WHERE "status" = 'active';--> statement-breakpoint
CREATE INDEX `idx_ko_course` ON `knowledge_objects` (`course_id`);--> statement-breakpoint
CREATE INDEX `idx_ko_chapter` ON `knowledge_objects` (`chapter_id`);--> statement-breakpoint
CREATE INDEX `idx_ko_concept` ON `knowledge_objects` (`concept_id`);--> statement-breakpoint
CREATE INDEX `idx_ko_status` ON `knowledge_objects` (`status`);--> statement-breakpoint
CREATE INDEX `idx_rel_source` ON `knowledge_relationships` (`source_ko_id`);--> statement-breakpoint
CREATE INDEX `idx_rel_target` ON `knowledge_relationships` (`target_ko_id`);--> statement-breakpoint
CREATE INDEX `idx_rel_source_target_type` ON `knowledge_relationships` (`source_ko_id`,`target_ko_id`,`type`);--> statement-breakpoint
CREATE INDEX `idx_le_student_course_created` ON `learning_events` (`student_id`,`course_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_le_student_concept` ON `learning_events` (`student_id`,`concept_name`);--> statement-breakpoint
CREATE INDEX `idx_live_results_session` ON `live_quiz_results` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_live_results_student` ON `live_quiz_results` (`student_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_live_result_session_student` ON `live_quiz_results` (`session_id`,`student_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `live_quiz_sessions_code_unique` ON `live_quiz_sessions` (`code`);--> statement-breakpoint
CREATE INDEX `idx_live_sessions_code` ON `live_quiz_sessions` (`code`);--> statement-breakpoint
CREATE INDEX `idx_live_sessions_course` ON `live_quiz_sessions` (`course_id`);--> statement-breakpoint
CREATE INDEX `idx_notifications_user_read` ON `notifications` (`user_id`,`read`);--> statement-breakpoint
CREATE INDEX `idx_notifications_user_created` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_qos_question` ON `question_option_stats` (`question_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_qos_question_option` ON `question_option_stats` (`question_id`,`option_index`);--> statement-breakpoint
CREATE INDEX `idx_templates_search` ON `quiz_templates` (`course_id`,`category`,`visibility`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_student_chap_prog` ON `student_chapter_progress` (`student_id`,`chapter_id`);--> statement-breakpoint
CREATE INDEX `idx_scm_student_course_score` ON `student_concept_mastery` (`student_id`,`course_id`,`mastery_score`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_scm_student_course_concept` ON `student_concept_mastery` (`student_id`,`course_id`,`concept_name`);--> statement-breakpoint
CREATE INDEX `idx_scmh_student_course` ON `student_concept_mastery_history` (`student_id`,`course_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_scmh_student_concept_date` ON `student_concept_mastery_history` (`student_id`,`concept_name`,`snapshot_date`);--> statement-breakpoint
CREATE INDEX `idx_student_fc_review` ON `student_flashcard_progress` (`student_id`,`next_review_due`);--> statement-breakpoint
CREATE INDEX `idx_attempts_student` ON `student_quiz_attempts` (`student_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_attempts_completed` ON `student_quiz_attempts` (`template_id`,`score`) WHERE "status" = 'completed';--> statement-breakpoint
CREATE INDEX `idx_study_paths_student` ON `study_paths` (`student_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_study_paths_student_course` ON `study_paths` (`student_id`,`course_id`);--> statement-breakpoint
CREATE INDEX `idx_tcm_student_course` ON `tutor_chat_messages` (`student_id`,`course_id`);--> statement-breakpoint
CREATE INDEX `idx_tcm_created_at` ON `tutor_chat_messages` (`created_at`);--> statement-breakpoint
CREATE INDEX `tutor_courses_tutor_idx` ON `tutor_courses` (`tutor_id`);--> statement-breakpoint
CREATE INDEX `tutor_courses_course_idx` ON `tutor_courses` (`course_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_tss_student_course` ON `tutor_session_summaries` (`student_id`,`course_id`);--> statement-breakpoint
CREATE INDEX `tutor_slots_tutor_idx` ON `tutor_slots` (`tutor_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_push_tokens_token_unique` ON `user_push_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `idx_push_tokens_user` ON `user_push_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_push_tokens_token` ON `user_push_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `idx_vector_sync_status` ON `vector_sync_queue` (`status`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE INDEX `idx_web_mat_ver_mat` ON `website_material_versions` (`material_id`);--> statement-breakpoint
CREATE INDEX `idx_web_mat_stale` ON `website_materials` (`is_stale`);--> statement-breakpoint
CREATE INDEX `idx_web_mat_chapter` ON `website_materials` (`chapter_id`);--> statement-breakpoint
CREATE INDEX `idx_weekly_ref_student` ON `weekly_reflections` (`student_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_weekly_ref_student_week` ON `weekly_reflections` (`student_id`,`week_start`);