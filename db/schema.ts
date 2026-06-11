import { relations, sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  unique,
} from "drizzle-orm/sqlite-core";

// Enums
/** Admin drive — folder tree + file pointers to UploadThing. */

/** Better Auth core model — export name must be `user` for the Drizzle adapter. */
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role").$type<"admin" | "teacher" | "student">().default("student"),
  lastActivityAt: integer("last_activity_at", { mode: "timestamp" }),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const driveItem = sqliteTable(
  "drive_item",
  {
    id: text("id").primaryKey(),
    /** `null` = My Drive root. FK ke `drive_item.id` ada di migration SQL (referensi Drizzle menghindari inference sirkuler). */
    parentId: text("parent_id"),
    kind: text("kind").$type<"folder" | "file">().notNull(),
    name: text("name").notNull(),
    /** UploadThing `key` — set only when `kind === "file"`. */
    uploadthingKey: text("uploadthing_key"),
    ufsUrl: text("ufs_url"),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("drive_item_parent_idx").on(table.parentId),
    index("drive_item_created_by_idx").on(table.createdByUserId),
  ],
);

export const driveItemRelations = relations(driveItem, ({ one, many }) => ({
  creator: one(user, {
    fields: [driveItem.createdByUserId],
    references: [user.id],
  }),
  parent: one(driveItem, {
    fields: [driveItem.parentId],
    references: [driveItem.id],
    relationName: "drive_item_tree",
  }),
  children: many(driveItem, { relationName: "drive_item_tree" }),
}));

// Courses Table
export const courses = sqliteTable("courses", {
  id: text("id").primaryKey(),
  title: text("title").notNull(), 
  category: text("category").notNull(), 
  description: text("description"),
});

// Enrollments Table
export const enrollments = sqliteTable("enrollments", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => user.id).notNull(),
  courseId: text("course_id").references(() => courses.id).notNull(),
  enrolledAt: integer("enrolled_at", { mode: "timestamp" }).defaultNow(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(), // Locks out students once the semester ends
});

// Progress (Materials) Table
export const progress = sqliteTable("progress", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => user.id),
  materialId: text("material_id"), // Ideally references a materials table
  status: text("status").default("completed"),
  completedAt: integer("completed_at", { mode: "timestamp" }).defaultNow(),
});

// Exams (Quizzes and Tryouts) Table
export const exams = sqliteTable("exams", {
  id: text("id").primaryKey(),
  courseId: text("course_id").references(() => courses.id).notNull(),
  title: text("title").notNull(),
  type: text("type").$type<"quiz" | "tryout">().notNull(), // Specifies if it is a quiz or tryout
  status: text("status").$type<"draft" | "published" | "ended">().default("draft").notNull(), // Can be draft, published, or ended
  settings: text("settings", { mode: "json" }), // Stores specific limits like "only three submissions" or "one time only"
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});

// Questions Table
export const questions = sqliteTable("questions", {
  id: text("id").primaryKey(),
  examId: text("exam_id").references(() => exams.id).notNull(),
  type: text("type").notNull(), // 'short_answer', 'multiple_choice', 'essay'
  content: text("content", { mode: "json" }).notNull(), // Hybrid approach using JSON blob for question data, options, and correct answers
  order: integer("order").notNull(),
});

// Submissions Table
export const submissions = sqliteTable("submissions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => user.id).notNull(),
  examId: text("exam_id").references(() => exams.id).notNull(),
  status: text("status").$type<"completed" | "pending_review" | "graded" | "late">().default("completed").notNull(), // Uses "pending_review" for essays
  score: integer("score"), // Stores calculated score
  teacherNotes: text("teacher_notes"), // Allows teacher to manually input feedback/notes
  submittedAt: integer("submitted_at", { mode: "timestamp" }).defaultNow(),
});

// Groups Table
export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Group Members Table (Many-to-Many between User and Groups)
export const groupMembers = sqliteTable(
  "group_members",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    joinedAt: integer("joined_at", { mode: "timestamp" }).defaultNow().notNull(),
  },
  (table) => [
    index("group_members_group_idx").on(table.groupId),
    index("group_members_user_idx").on(table.userId),
  ]
);

// Enrollment Tokens Table
export const enrollmentTokens = sqliteTable("enrollment_tokens", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  capacity: integer("capacity").default(1).notNull(), // Capacity from 1 to 5 people
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

// Enrollment Token Courses Join Table (Many-to-Many between Token and Courses)
export const enrollmentTokenCourses = sqliteTable(
  "enrollment_token_courses",
  {
    tokenId: text("token_id")
      .notNull()
      .references(() => enrollmentTokens.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("token_courses_token_idx").on(table.tokenId),
    index("token_courses_course_idx").on(table.courseId),
  ]
);

// Relations definitions
export const groupsRelations = relations(groups, ({ many }) => ({
  members: many(groupMembers),
  tokens: many(enrollmentTokens),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(user, {
    fields: [groupMembers.userId],
    references: [user.id],
  }),
}));

export const enrollmentTokensRelations = relations(enrollmentTokens, ({ one, many }) => ({
  group: one(groups, {
    fields: [enrollmentTokens.groupId],
    references: [groups.id],
  }),
  tokenCourses: many(enrollmentTokenCourses),
}));

export const enrollmentTokenCoursesRelations = relations(enrollmentTokenCourses, ({ one }) => ({
  token: one(enrollmentTokens, {
    fields: [enrollmentTokenCourses.tokenId],
    references: [enrollmentTokens.id],
  }),
  course: one(courses, {
    fields: [enrollmentTokenCourses.courseId],
    references: [courses.id],
  }),
}));

// Tutor Courses Table (Which courses a tutor can teach)
export const tutorCourses = sqliteTable(
  "tutor_courses",
  {
    id: text("id").primaryKey(),
    tutorId: text("tutor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
  },
  (table) => [
    index("tutor_courses_tutor_idx").on(table.tutorId),
    index("tutor_courses_course_idx").on(table.courseId),
  ]
);

// Tutor Slots Table (Weekly empty slots listed by tutors)
export const tutorSlots = sqliteTable(
  "tutor_slots",
  {
    id: text("id").primaryKey(),
    tutorId: text("tutor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    dayOfWeek: text("day_of_week").notNull(), // 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
    startTime: text("start_time").notNull(), // '09:00'
    endTime: text("end_time").notNull(), // '10:30'
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
  },
  (table) => [
    index("tutor_slots_tutor_idx").on(table.tutorId),
  ]
);

// Bookings Table (Appointments chosen by students)
export const bookings = sqliteTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    slotId: text("slot_id")
      .notNull()
      .references(() => tutorSlots.id, { onDelete: "cascade" })
      .unique(), // Ensure first-come first-served (only one booking per slot)
    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    bookedAt: integer("booked_at", { mode: "timestamp" }).defaultNow().notNull(),
  },
  (table) => [
    index("bookings_slot_idx").on(table.slotId),
    index("bookings_student_idx").on(table.studentId),
    index("bookings_group_idx").on(table.groupId),
  ]
);

// Relations for tutorCourses
export const tutorCoursesRelations = relations(tutorCourses, ({ one }) => ({
  tutor: one(user, {
    fields: [tutorCourses.tutorId],
    references: [user.id],
  }),
  course: one(courses, {
    fields: [tutorCourses.courseId],
    references: [courses.id],
  }),
}));

// Relations for tutorSlots
export const tutorSlotsRelations = relations(tutorSlots, ({ one }) => ({
  tutor: one(user, {
    fields: [tutorSlots.tutorId],
    references: [user.id],
  }),
  booking: one(bookings, {
    fields: [tutorSlots.id],
    references: [bookings.slotId],
  }),
}));

// Relations for bookings
export const bookingsRelations = relations(bookings, ({ one }) => ({
  slot: one(tutorSlots, {
    fields: [bookings.slotId],
    references: [tutorSlots.id],
  }),
  student: one(user, {
    fields: [bookings.studentId],
    references: [user.id],
  }),
  course: one(courses, {
    fields: [bookings.courseId],
    references: [courses.id],
  }),
  group: one(groups, {
    fields: [bookings.groupId],
    references: [groups.id],
  }),
}));

// ───────────────────────────────────────────────────────────// Enums for AI domain

// New Enums for ZYX Content Ecosystem (Revision v4 - Frozen)

// A. ai_material_instances — top-level knowledge asset metadata
export const aiMaterialInstances = sqliteTable(
  "ai_material_instances",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    sourceType: text("source_type").$type<"markdown" | "json" | "pdf_extraction">().notNull(),
    summary: text("summary").notNull(),
    learningObjectives: text("learning_objectives", { mode: "json" }).$defaultFn(() => []).notNull(),
    keywords: text("keywords", { mode: "json" }).$defaultFn(() => []).notNull(),
    pineconeSyncStatus: text("pinecone_sync_status").default("pending").notNull(),
    lastSyncError: text("last_sync_error"),
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("ai_instances_course_idx").on(table.courseId),
  ]
);

// B. ai_material_instance_sections — groups chunks by subtopic
export const aiMaterialInstanceSections = sqliteTable(
  "ai_material_instance_sections",
  {
    id: text("id").primaryKey(),
    materialInstanceId: text("material_instance_id")
      .notNull()
      .references(() => aiMaterialInstances.id, { onDelete: "cascade" }),
    title: text("title"),
    orderIndex: integer("order_index").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
  },
  (table) => [
    index("ai_sections_instance_idx").on(table.materialInstanceId, table.orderIndex),
  ]
);

// C. ai_material_instance_chunks — physical text segments synced with Pinecone
export const aiMaterialInstanceChunks = sqliteTable(
  "ai_material_instance_chunks",
  {
    id: text("id").primaryKey(),
    sectionId: text("section_id")
      .notNull()
      .references(() => aiMaterialInstanceSections.id, { onDelete: "cascade" }),
    chunkText: text("chunk_text").notNull(),
    orderIndex: integer("order_index").notNull(),
    pineconeVectorId: text("pinecone_vector_id").notNull(),
    isSynced: integer("is_synced", { mode: "boolean" }).default(false).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_chunks_section").on(table.sectionId, table.orderIndex),
  ]
);

// D. ai_generation_jobs — tracks background Gemini generation requests
export const aiGenerationJobs = sqliteTable(
  "ai_generation_jobs",
  {
    id: text("id").primaryKey(),
    tutorId: text("tutor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    status: text("status").$type<"pending" | "processing" | "completed" | "failed">().default("pending").notNull(),
    promptParameters: text("prompt_parameters", { mode: "json" }).notNull(),
    targetCount: integer("target_count").notNull(),
    generatedCount: integer("generated_count").default(0).notNull(),
    tokenUsage: integer("token_usage").default(0).notNull(),
    errorMessage: text("error_message"),
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_jobs_status").on(table.courseId, table.status),
  ]
);

// E. ai_question_bank — permanent, reusable question repository (modified for KO references)
export const aiQuestionBank = sqliteTable(
  "ai_question_bank",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    sourceSectionId: text("source_section_id")
      .references(() => aiMaterialInstanceSections.id, { onDelete: "set null" }),
    
    // Final v4 adjustments
    knowledgeObjectId: text("knowledge_object_id")
      .references(() => knowledgeObjects.id, { onDelete: "set null" }),
    sourceMtdId: text("source_mtd_id")
      .references(() => masterTeachingDocuments.id, { onDelete: "set null" }),
    sourceMtdVersion: integer("source_mtd_version"),
    generationHash: text("generation_hash"),
    status: text("status").default("active").notNull(),
    
    difficulty: text("difficulty").$type<"easy" | "medium" | "hard">().default("medium").notNull(),
    questionType: text("question_type").$type<"multiple_choice" | "multiple_choices">().default("multiple_choice").notNull(),
    tags: text("tags", { mode: "json" }).$defaultFn(() => []).notNull(),
    prompt: text("prompt").notNull(),
    options: text("options", { mode: "json" }).notNull(),
    correctIndices: text("correct_indices", { mode: "json" }).notNull(),
    explanation: text("explanation").notNull(),
    reviewStatus: text("review_status").$type<"generated" | "reviewed" | "published" | "flagged" | "retired">().default("generated").notNull(),
    qualityScore: real("quality_score").default(1.0).notNull(),
    useCount: integer("use_count").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_qbank_selection").on(table.courseId, table.reviewStatus, table.difficulty, table.useCount),
    index("idx_qbank_tags").on(table.tags),
    index("idx_qbank_ko").on(table.knowledgeObjectId),
  ]
);

// F. quiz_templates — publishable quiz configurations with selection rules
export const quizTemplates = sqliteTable(
  "quiz_templates",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: text("category").$type<"daily" | "weekly" | "chapter" | "premium">().notNull(),
    visibility: text("visibility").$type<"free" | "paid">().default("free").notNull(),
    timeLimitSeconds: integer("time_limit_seconds"),
    maxAttempts: integer("max_attempts"),
    selectionRules: text("selection_rules", { mode: "json" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_templates_search").on(table.courseId, table.category, table.visibility),
  ]
);

// G. student_quiz_attempts — user quiz session with deep question snapshots
export const studentQuizAttempts = sqliteTable(
  "student_quiz_attempts",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    templateId: text("template_id")
      .notNull()
      .references(() => quizTemplates.id, { onDelete: "cascade" }),
    score: integer("score"),
    durationSeconds: integer("duration_seconds"),
    status: text("status").$type<"in_progress" | "completed" | "abandoned">().default("in_progress").notNull(),
    questionsSnapshot: text("questions_snapshot", { mode: "json" }).notNull(),
    answersSnapshot: text("answers_snapshot", { mode: "json" }),
    startedAt: integer("started_at", { mode: "timestamp" }).defaultNow().notNull(),
    submittedAt: integer("submitted_at", { mode: "timestamp" }),
  },
  (table) => [
    index("idx_attempts_student").on(table.studentId, table.status),
    index("idx_attempts_completed").on(table.templateId, table.score).where(sql`"status" = 'completed'`),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// NEW DOMAINS (Revision v4 - Frozen)
// ─────────────────────────────────────────────────────────────────────────────

// 1. chapters
export const chapters = sqliteTable(
  "chapters",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    orderIndex: integer("order_index").notNull(),
    status: text("status").default("draft").notNull(), // 'draft', 'published'
    assetGenStatus: text("asset_gen_status").default("idle").notNull(), // 'idle', 'generating', 'completed', 'failed'
    assetGenFlashcardsTotal: integer("asset_gen_flashcards_total").default(0).notNull(),
    assetGenFlashcardsCurrent: integer("asset_gen_flashcards_current").default(0).notNull(),
    assetGenQuestionsTotal: integer("asset_gen_questions_total").default(0).notNull(),
    assetGenQuestionsCurrent: integer("asset_gen_questions_current").default(0).notNull(),
    assetGenError: text("asset_gen_error"),
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_chapters_course_order").on(table.courseId, table.orderIndex),
  ]
);

// 2. student_chapter_progress
export const studentChapterProgress = sqliteTable(
  "student_chapter_progress",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    chapterId: text("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    unlocked: integer("unlocked", { mode: "boolean" }).default(false).notNull(),
    completed: integer("completed", { mode: "boolean" }).default(false).notNull(),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_student_chap_prog").on(table.studentId, table.chapterId),
  ]
);

// 3. master_teaching_documents
export const masterTeachingDocuments = sqliteTable(
  "master_teaching_documents",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .references(() => driveItem.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    markdownContent: text("markdown_content").notNull(),
    version: integer("version").default(1).notNull(),
    status: text("status").default("draft").notNull(), // 'draft', 'active', 'archived'
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id),
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  }
);

// 4. knowledge_objects
export const knowledgeObjects = sqliteTable(
  "knowledge_objects",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    mtdId: text("mtd_id")
      .notNull()
      .references(() => masterTeachingDocuments.id, { onDelete: "cascade" }),
    chapterId: text("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    conceptId: text("concept_id").notNull(), // Stable machine-readable identifier
    learningOrder: integer("learning_order").notNull(),
    title: text("title").notNull(),
    conceptName: text("concept_name").notNull(),
    content: text("content").notNull(), // Markdown + LaTeX
    type: text("type").$type<"definition" | "formula" | "example" | "misconception" | "exercise" | "summary" | "objective" | "concept_overview">().notNull(),
    difficulty: text("difficulty").$type<"easy" | "medium" | "hard">().default("medium").notNull(),
    bloomLevel: text("bloom_level").$type<"remember" | "understand" | "apply" | "analyze" | "evaluate" | "create">().notNull(),
    tags: text("tags", { mode: "json" }).$defaultFn(() => []).notNull(),
    importance: text("importance").$type<"high" | "medium" | "low">().default("medium").notNull(),
    metadata: text("metadata", { mode: "json" }).$defaultFn(() => ({})).notNull(),
    pineconeVectorId: text("pinecone_vector_id"), // Nullable until vector sync succeeds
    status: text("status").$type<"active" | "retired">().default("active").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_ko_course").on(table.courseId),
    index("idx_ko_chapter").on(table.chapterId),
    index("idx_ko_concept").on(table.conceptId),
    index("idx_ko_status").on(table.status),
  ]
);

// 5. website_materials (Single Material per Chapter, M:N links removed)
export const websiteMaterials = sqliteTable(
  "website_materials",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    chapterId: text("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    sourceMtdId: text("source_mtd_id")
      .notNull()
      .references(() => masterTeachingDocuments.id, { onDelete: "cascade" }),
    sourceMtdVersion: integer("source_mtd_version").notNull(),
    isStale: integer("is_stale", { mode: "boolean" }).default(false).notNull(),
    generationHash: text("generation_hash").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    canonicalMarkdown: text("canonical_markdown").notNull(), // Markdown = editable
    structuredContent: text("structured_content", { mode: "json" }).notNull(), // AST = executable
    contentVersion: integer("content_version").default(1).notNull(),
    status: text("status").default("draft").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_web_mat_stale").on(table.isStale),
    index("idx_web_mat_chapter").on(table.chapterId),
  ]
);

// 5b. website_material_versions
export const websiteMaterialVersions = sqliteTable(
  "website_material_versions",
  {
    id: text("id").primaryKey(),
    materialId: text("material_id")
      .notNull()
      .references(() => websiteMaterials.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    canonicalMarkdown: text("canonical_markdown").notNull(),
    structuredContent: text("structured_content", { mode: "json" }).notNull(),
    authorId: text("author_id")
      .references(() => user.id, { onDelete: "set null" }),
    changeSummary: text("change_summary"),
    isAiGenerated: integer("is_ai_generated", { mode: "boolean" }).default(false).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_web_mat_ver_mat").on(table.materialId),
  ]
);

// 6. vector_sync_queue (Transactional Outbox)
export const vectorSyncQueue = sqliteTable(
  "vector_sync_queue",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    koId: text("ko_id")
      .references(() => knowledgeObjects.id, { onDelete: "set null" }),
    action: text("action").$type<"upsert" | "delete">().notNull(),
    payload: text("payload", { mode: "json" }).notNull(),
    status: text("status").$type<"pending" | "processing" | "completed" | "failed">().default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    lastError: text("last_error"),
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_vector_sync_status").on(table.status),
  ]
);

// 7. flashcard_sets
export const flashcardSets = sqliteTable(
  "flashcard_sets",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    chapterId: text("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    sourceMtdId: text("source_mtd_id")
      .notNull()
      .references(() => masterTeachingDocuments.id, { onDelete: "cascade" }),
    sourceMtdVersion: integer("source_mtd_version").notNull(),
    isStale: integer("is_stale", { mode: "boolean" }).default(false).notNull(),
    generationHash: text("generation_hash").notNull(),
    title: text("title").notNull(),
    status: text("status").default("draft").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  }
);

// 8. flashcards
export const flashcards = sqliteTable(
  "flashcards",
  {
    id: text("id").primaryKey(),
    setId: text("set_id")
      .notNull()
      .references(() => flashcardSets.id, { onDelete: "cascade" }),
    koId: text("ko_id")
      .references(() => knowledgeObjects.id, { onDelete: "set null" }),
    front: text("front").notNull(),
    back: text("back").notNull(),
    explanation: text("explanation"),
    status: text("status").$type<"active" | "retired">().default("active").notNull(),
    metadata: text("metadata", { mode: "json" }).$defaultFn(() => ({})).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
  }
);

// 9. student_flashcard_progress
export const studentFlashcardProgress = sqliteTable(
  "student_flashcard_progress",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    flashcardId: text("flashcard_id")
      .notNull()
      .references(() => flashcards.id, { onDelete: "cascade" }),
    box: integer("box").default(1).notNull(),
    nextReviewDue: integer("next_review_due", { mode: "timestamp" }).defaultNow().notNull(),
    lastReviewedAt: integer("last_reviewed_at", { mode: "timestamp" }),
    history: text("history", { mode: "json" }).$defaultFn(() => []).notNull(),
    metadata: text("metadata", { mode: "json" }).$defaultFn(() => ({})).notNull(),
  },
  (table) => [
    index("idx_student_fc_review").on(table.studentId, table.nextReviewDue),
  ]
);

// 10. diktats
export const diktats = sqliteTable(
  "diktats",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    sourceMtdId: text("source_mtd_id")
      .notNull()
      .references(() => masterTeachingDocuments.id, { onDelete: "cascade" }),
    sourceMtdVersion: integer("source_mtd_version").notNull(),
    isStale: integer("is_stale", { mode: "boolean" }).default(false).notNull(),
    generationHash: text("generation_hash").notNull(),
    title: text("title").notNull(),
    fileUrl: text("file_url"),
    chapterIds: text("chapter_ids", { mode: "json" }).notNull(),
    settings: text("settings", { mode: "json" }).$defaultFn(() => ({})).notNull(),
    status: text("status").default("draft").notNull(), // 'draft', 'generating', 'ready', 'failed'
    downloadCount: integer("download_count").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  }
);

// 11. knowledge_relationships

export const knowledgeRelationships = sqliteTable(
  "knowledge_relationships",
  {
    id: text("id").primaryKey(),
    sourceKoId: text("source_ko_id")
      .notNull()
      .references(() => knowledgeObjects.id, { onDelete: "cascade" }),
    targetKoId: text("target_ko_id")
      .notNull()
      .references(() => knowledgeObjects.id, { onDelete: "cascade" }),
    type: text("type").$type<"prerequisite" | "related" | "extends" | "example_of" | "misconception_of">().notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_rel_source").on(table.sourceKoId),
    index("idx_rel_target").on(table.targetKoId),
    index("idx_rel_source_target_type").on(table.sourceKoId, table.targetKoId, table.type),
  ]
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const aiMaterialInstancesRelations = relations(aiMaterialInstances, ({ one, many }) => ({
  course: one(courses, {
    fields: [aiMaterialInstances.courseId],
    references: [courses.id],
  }),
  sections: many(aiMaterialInstanceSections),
}));

export const aiMaterialInstanceSectionsRelations = relations(aiMaterialInstanceSections, ({ one, many }) => ({
  instance: one(aiMaterialInstances, {
    fields: [aiMaterialInstanceSections.materialInstanceId],
    references: [aiMaterialInstances.id],
  }),
  chunks: many(aiMaterialInstanceChunks),
  questions: many(aiQuestionBank),
}));

export const aiMaterialInstanceChunksRelations = relations(aiMaterialInstanceChunks, ({ one }) => ({
  section: one(aiMaterialInstanceSections, {
    fields: [aiMaterialInstanceChunks.sectionId],
    references: [aiMaterialInstanceSections.id],
  }),
}));

export const aiGenerationJobsRelations = relations(aiGenerationJobs, ({ one }) => ({
  tutor: one(user, {
    fields: [aiGenerationJobs.tutorId],
    references: [user.id],
  }),
  course: one(courses, {
    fields: [aiGenerationJobs.courseId],
    references: [courses.id],
  }),
}));

export const aiQuestionBankRelations = relations(aiQuestionBank, ({ one }) => ({
  course: one(courses, {
    fields: [aiQuestionBank.courseId],
    references: [courses.id],
  }),
  sourceSection: one(aiMaterialInstanceSections, {
    fields: [aiQuestionBank.sourceSectionId],
    references: [aiMaterialInstanceSections.id],
  }),
  knowledgeObject: one(knowledgeObjects, {
    fields: [aiQuestionBank.knowledgeObjectId],
    references: [knowledgeObjects.id],
  }),
  sourceMtd: one(masterTeachingDocuments, {
    fields: [aiQuestionBank.sourceMtdId],
    references: [masterTeachingDocuments.id],
  }),
}));

export const quizTemplatesRelations = relations(quizTemplates, ({ one, many }) => ({
  course: one(courses, {
    fields: [quizTemplates.courseId],
    references: [courses.id],
  }),
  attempts: many(studentQuizAttempts),
}));

export const studentQuizAttemptsRelations = relations(studentQuizAttempts, ({ one }) => ({
  student: one(user, {
    fields: [studentQuizAttempts.studentId],
    references: [user.id],
  }),
  template: one(quizTemplates, {
    fields: [studentQuizAttempts.templateId],
    references: [quizTemplates.id],
  }),
}));

// New domain relations
export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  course: one(courses, {
    fields: [chapters.courseId],
    references: [courses.id],
  }),
  knowledgeObjects: many(knowledgeObjects),
  websiteMaterials: many(websiteMaterials),
  flashcardSets: many(flashcardSets),
  progressions: many(studentChapterProgress),
}));

export const studentChapterProgressRelations = relations(studentChapterProgress, ({ one }) => ({
  student: one(user, {
    fields: [studentChapterProgress.studentId],
    references: [user.id],
  }),
  chapter: one(chapters, {
    fields: [studentChapterProgress.chapterId],
    references: [chapters.id],
  }),
}));

export const masterTeachingDocumentsRelations = relations(masterTeachingDocuments, ({ one, many }) => ({
  course: one(courses, {
    fields: [masterTeachingDocuments.courseId],
    references: [courses.id],
  }),
  knowledgeObjects: many(knowledgeObjects),
  websiteMaterials: many(websiteMaterials),
  flashcardSets: many(flashcardSets),
  diktats: many(diktats),
  questions: many(aiQuestionBank),
}));

export const knowledgeObjectsRelations = relations(knowledgeObjects, ({ one, many }) => ({
  course: one(courses, {
    fields: [knowledgeObjects.courseId],
    references: [courses.id],
  }),
  mtd: one(masterTeachingDocuments, {
    fields: [knowledgeObjects.mtdId],
    references: [masterTeachingDocuments.id],
  }),
  chapter: one(chapters, {
    fields: [knowledgeObjects.chapterId],
    references: [chapters.id],
  }),
  flashcards: many(flashcards),
  questions: many(aiQuestionBank),
  syncActions: many(vectorSyncQueue),
}));

export const websiteMaterialsRelations = relations(websiteMaterials, ({ one, many }) => ({
  course: one(courses, {
    fields: [websiteMaterials.courseId],
    references: [courses.id],
  }),
  chapter: one(chapters, {
    fields: [websiteMaterials.chapterId],
    references: [chapters.id],
  }),
  sourceMtd: one(masterTeachingDocuments, {
    fields: [websiteMaterials.sourceMtdId],
    references: [masterTeachingDocuments.id],
  }),
  versions: many(websiteMaterialVersions),
}));

export const websiteMaterialVersionsRelations = relations(websiteMaterialVersions, ({ one }) => ({
  material: one(websiteMaterials, {
    fields: [websiteMaterialVersions.materialId],
    references: [websiteMaterials.id],
  }),
  author: one(user, {
    fields: [websiteMaterialVersions.authorId],
    references: [user.id],
  }),
}));

export const vectorSyncQueueRelations = relations(vectorSyncQueue, ({ one }) => ({
  course: one(courses, {
    fields: [vectorSyncQueue.courseId],
    references: [courses.id],
  }),
  ko: one(knowledgeObjects, {
    fields: [vectorSyncQueue.koId],
    references: [knowledgeObjects.id],
  }),
}));

export const flashcardSetsRelations = relations(flashcardSets, ({ one, many }) => ({
  course: one(courses, {
    fields: [flashcardSets.courseId],
    references: [courses.id],
  }),
  chapter: one(chapters, {
    fields: [flashcardSets.chapterId],
    references: [chapters.id],
  }),
  sourceMtd: one(masterTeachingDocuments, {
    fields: [flashcardSets.sourceMtdId],
    references: [masterTeachingDocuments.id],
  }),
  flashcards: many(flashcards),
}));

export const flashcardsRelations = relations(flashcards, ({ one, many }) => ({
  set: one(flashcardSets, {
    fields: [flashcards.setId],
    references: [flashcardSets.id],
  }),
  ko: one(knowledgeObjects, {
    fields: [flashcards.koId],
    references: [knowledgeObjects.id],
  }),
  progressions: many(studentFlashcardProgress),
}));

export const studentFlashcardProgressRelations = relations(studentFlashcardProgress, ({ one }) => ({
  student: one(user, {
    fields: [studentFlashcardProgress.studentId],
    references: [user.id],
  }),
  flashcard: one(flashcards, {
    fields: [studentFlashcardProgress.flashcardId],
    references: [flashcards.id],
  }),
}));

export const diktatsRelations = relations(diktats, ({ one }) => ({
  course: one(courses, {
    fields: [diktats.courseId],
    references: [courses.id],
  }),
  sourceMtd: one(masterTeachingDocuments, {
    fields: [diktats.sourceMtdId],
    references: [masterTeachingDocuments.id],
  }),
}));

export const knowledgeRelationshipsRelations = relations(knowledgeRelationships, ({ one }) => ({
  sourceKo: one(knowledgeObjects, {
    fields: [knowledgeRelationships.sourceKoId],
    references: [knowledgeObjects.id],
  }),
  targetKo: one(knowledgeObjects, {
    fields: [knowledgeRelationships.targetKoId],
    references: [knowledgeObjects.id],
  }),
}));

export const aiUsageEvents = sqliteTable(
  "ai_usage_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    feature: text("feature").notNull(), // 'tutor' | 'flashcards' | 'quiz' | 'diktat'
    model: text("model").notNull(), // e.g. 'gemini-3.1-flash-lite' | 'gemma-4-26b'
    tokens: integer("tokens").default(0).notNull(),
    requestType: text("request_type").notNull(), // 'explain_concept' | 'analyze_mistake'
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_usage_user_created").on(table.userId, table.createdAt),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// PUSH NOTIFICATIONS DOMAIN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * user_push_tokens — FCM device registration tokens per user.
 * One user can have multiple tokens (phone, tablet, laptop).
 * The `token` column is unique to prevent duplicates across users.
 */
export const userPushTokens = sqliteTable(
  "user_push_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Raw FCM registration token returned by getToken(). Unique across all devices. */
    token: text("token").notNull().unique(),
    /** Human-readable device label (e.g. userAgent substring or "Chrome on Windows"). */
    device: text("device").notNull().default("unknown"),
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_push_tokens_user").on(table.userId),
    index("idx_push_tokens_token").on(table.token),
  ]
);

/**
 * notifications — In-app notification log.
 * Persists every push sent so users can view a notification history.
 */
export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    /** Notification category for client-side filtering and routing. */
    type: text("type")
      .$type<
        | "quiz_published"
        | "flashcard_reminder"
        | "tutor_reminder"
        | "payment_success"
        | "admin_broadcast"
      >()
      .notNull(),
    /** Whether the user has read/dismissed this notification. */
    read: integer("read", { mode: "boolean" }).default(false).notNull(),
    /** Arbitrary JSON payload (e.g. quizId, courseId, bookingId). */
    metadata: text("metadata", { mode: "json" }).$defaultFn(() => ({})).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_notifications_user_read").on(table.userId, table.read),
    index("idx_notifications_user_created").on(table.userId, table.createdAt),
  ]
);

// ─── Push Notifications Relations ─────────────────────────────────────────────

export const userPushTokensRelations = relations(userPushTokens, ({ one }) => ({
  user: one(user, {
    fields: [userPushTokens.userId],
    references: [user.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(user, {
    fields: [notifications.userId],
    references: [user.id],
  }),
}));