CREATE TYPE "public"."ai_difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."ai_job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ai_question_type" AS ENUM('multiple_choice', 'multiple_choices');--> statement-breakpoint
CREATE TYPE "public"."ai_review_status" AS ENUM('generated', 'reviewed', 'published', 'flagged', 'retired');--> statement-breakpoint
CREATE TYPE "public"."ai_source_type" AS ENUM('markdown', 'json', 'pdf_extraction');--> statement-breakpoint
CREATE TYPE "public"."quiz_attempt_status" AS ENUM('in_progress', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."quiz_category" AS ENUM('daily', 'weekly', 'chapter', 'premium');--> statement-breakpoint
CREATE TYPE "public"."quiz_visibility" AS ENUM('free', 'paid');--> statement-breakpoint
CREATE TABLE "ai_generation_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"tutor_id" text NOT NULL,
	"course_id" text NOT NULL,
	"status" "ai_job_status" DEFAULT 'pending' NOT NULL,
	"prompt_parameters" jsonb NOT NULL,
	"target_count" integer NOT NULL,
	"generated_count" integer DEFAULT 0 NOT NULL,
	"token_usage" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_material_instance_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"section_id" text NOT NULL,
	"chunk_text" text NOT NULL,
	"order_index" integer NOT NULL,
	"pinecone_vector_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_material_instance_sections" (
	"id" text PRIMARY KEY NOT NULL,
	"material_instance_id" text NOT NULL,
	"title" varchar(255),
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_material_instances" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"title" varchar(255) NOT NULL,
	"source_type" "ai_source_type" NOT NULL,
	"summary" text NOT NULL,
	"learning_objectives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_question_bank" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"source_section_id" text,
	"difficulty" "ai_difficulty" DEFAULT 'medium' NOT NULL,
	"question_type" "ai_question_type" DEFAULT 'multiple_choice' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"prompt" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_indices" jsonb NOT NULL,
	"explanation" text NOT NULL,
	"review_status" "ai_review_status" DEFAULT 'generated' NOT NULL,
	"quality_score" real DEFAULT 1 NOT NULL,
	"use_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"slot_id" text NOT NULL,
	"student_id" text NOT NULL,
	"course_id" text NOT NULL,
	"group_id" text NOT NULL,
	"booked_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_slot_id_unique" UNIQUE("slot_id")
);
--> statement-breakpoint
CREATE TABLE "quiz_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"title" varchar(255) NOT NULL,
	"category" "quiz_category" NOT NULL,
	"visibility" "quiz_visibility" DEFAULT 'free' NOT NULL,
	"time_limit_seconds" integer,
	"max_attempts" integer,
	"selection_rules" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_quiz_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"template_id" text NOT NULL,
	"score" integer,
	"duration_seconds" integer,
	"status" "quiz_attempt_status" DEFAULT 'in_progress' NOT NULL,
	"questions_snapshot" jsonb NOT NULL,
	"answers_snapshot" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"submitted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tutor_courses" (
	"id" text PRIMARY KEY NOT NULL,
	"tutor_id" text NOT NULL,
	"course_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutor_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"tutor_id" text NOT NULL,
	"day_of_week" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_generation_jobs" ADD CONSTRAINT "ai_generation_jobs_tutor_id_user_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generation_jobs" ADD CONSTRAINT "ai_generation_jobs_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_material_instance_chunks" ADD CONSTRAINT "ai_material_instance_chunks_section_id_ai_material_instance_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."ai_material_instance_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_material_instance_sections" ADD CONSTRAINT "ai_material_instance_sections_material_instance_id_ai_material_instances_id_fk" FOREIGN KEY ("material_instance_id") REFERENCES "public"."ai_material_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_material_instances" ADD CONSTRAINT "ai_material_instances_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_question_bank" ADD CONSTRAINT "ai_question_bank_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_question_bank" ADD CONSTRAINT "ai_question_bank_source_section_id_ai_material_instance_sections_id_fk" FOREIGN KEY ("source_section_id") REFERENCES "public"."ai_material_instance_sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_id_tutor_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."tutor_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_templates" ADD CONSTRAINT "quiz_templates_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_quiz_attempts" ADD CONSTRAINT "student_quiz_attempts_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_quiz_attempts" ADD CONSTRAINT "student_quiz_attempts_template_id_quiz_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."quiz_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_courses" ADD CONSTRAINT "tutor_courses_tutor_id_user_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_courses" ADD CONSTRAINT "tutor_courses_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_slots" ADD CONSTRAINT "tutor_slots_tutor_id_user_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_jobs_status" ON "ai_generation_jobs" USING btree ("course_id","status");--> statement-breakpoint
CREATE INDEX "idx_chunks_section" ON "ai_material_instance_chunks" USING btree ("section_id","order_index");--> statement-breakpoint
CREATE INDEX "ai_sections_instance_idx" ON "ai_material_instance_sections" USING btree ("material_instance_id","order_index");--> statement-breakpoint
CREATE INDEX "ai_instances_course_idx" ON "ai_material_instances" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_qbank_selection" ON "ai_question_bank" USING btree ("course_id","review_status","difficulty","use_count");--> statement-breakpoint
CREATE INDEX "idx_qbank_tags" ON "ai_question_bank" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "bookings_slot_idx" ON "bookings" USING btree ("slot_id");--> statement-breakpoint
CREATE INDEX "bookings_student_idx" ON "bookings" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "bookings_group_idx" ON "bookings" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_templates_search" ON "quiz_templates" USING btree ("course_id","category","visibility");--> statement-breakpoint
CREATE INDEX "idx_attempts_student" ON "student_quiz_attempts" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "idx_attempts_completed" ON "student_quiz_attempts" USING btree ("template_id","score") WHERE "status" = 'completed';--> statement-breakpoint
CREATE INDEX "tutor_courses_tutor_idx" ON "tutor_courses" USING btree ("tutor_id");--> statement-breakpoint
CREATE INDEX "tutor_courses_course_idx" ON "tutor_courses" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "tutor_slots_tutor_idx" ON "tutor_slots" USING btree ("tutor_id");