import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  integer,
  jsonb,
  boolean,
  index,
  varchar,
  real,
} from "drizzle-orm/pg-core";

// Enums
export const roleEnum = pgEnum("role", ["admin", "teacher", "student"]);
export const examTypeEnum = pgEnum("exam_type", ["quiz", "tryout"]);
export const examStatusEnum = pgEnum("exam_status", ["draft", "published", "ended"]);
export const submissionStatusEnum = pgEnum("submission_status", ["completed", "pending_review", "graded", "late"]);
/** Admin drive — folder tree + file pointers to UploadThing. */
export const driveKindEnum = pgEnum("drive_kind", ["folder", "file"]);

/** Better Auth core model — export name must be `user` for the Drizzle adapter. */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: roleEnum("role").default("student"),
  lastActivityAt: timestamp("last_activity_at"),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
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

export const account = pgTable(
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
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
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

export const driveItem = pgTable(
  "drive_item",
  {
    id: text("id").primaryKey(),
    /** `null` = My Drive root. FK ke `drive_item.id` ada di migration SQL (referensi Drizzle menghindari inference sirkuler). */
    parentId: text("parent_id"),
    kind: driveKindEnum("kind").notNull(),
    name: text("name").notNull(),
    /** UploadThing `key` — set only when `kind === "file"`. */
    uploadthingKey: text("uploadthing_key"),
    ufsUrl: text("ufs_url"),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
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
export const courses = pgTable("courses", {
  id: text("id").primaryKey(),
  title: text("title").notNull(), 
  category: text("category").notNull(), 
  description: text("description"),
});

// Enrollments Table
export const enrollments = pgTable("enrollments", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => user.id).notNull(),
  courseId: text("course_id").references(() => courses.id).notNull(),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // Locks out students once the semester ends
});

// Progress (Materials) Table
export const progress = pgTable("progress", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => user.id),
  materialId: text("material_id"), // Ideally references a materials table
  status: text("status").default("completed"),
  completedAt: timestamp("completed_at").defaultNow(),
});

// Exams (Quizzes and Tryouts) Table
export const exams = pgTable("exams", {
  id: text("id").primaryKey(),
  courseId: text("course_id").references(() => courses.id).notNull(),
  title: text("title").notNull(),
  type: examTypeEnum("type").notNull(), // Specifies if it is a quiz or tryout
  status: examStatusEnum("status").default("draft").notNull(), // Can be draft, published, or ended
  settings: jsonb("settings"), // Stores specific limits like "only three submissions" or "one time only"
  createdAt: timestamp("created_at").defaultNow(),
});

// Questions Table
export const questions = pgTable("questions", {
  id: text("id").primaryKey(),
  examId: text("exam_id").references(() => exams.id).notNull(),
  type: text("type").notNull(), // 'short_answer', 'multiple_choice', 'essay'
  content: jsonb("content").notNull(), // Hybrid approach using JSON blob for question data, options, and correct answers
  order: integer("order").notNull(),
});

// Submissions Table
export const submissions = pgTable("submissions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => user.id).notNull(),
  examId: text("exam_id").references(() => exams.id).notNull(),
  status: submissionStatusEnum("status").default("completed").notNull(), // Uses "pending_review" for essays
  score: integer("score"), // Stores calculated score
  teacherNotes: text("teacher_notes"), // Allows teacher to manually input feedback/notes
  submittedAt: timestamp("submitted_at").defaultNow(),
});

// Groups Table
export const groups = pgTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Group Members Table (Many-to-Many between User and Groups)
export const groupMembers = pgTable(
  "group_members",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [
    index("group_members_group_idx").on(table.groupId),
    index("group_members_user_idx").on(table.userId),
  ]
);

// Enrollment Tokens Table
export const enrollmentTokens = pgTable("enrollment_tokens", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  capacity: integer("capacity").default(1).notNull(), // Capacity from 1 to 5 people
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

// Enrollment Token Courses Join Table (Many-to-Many between Token and Courses)
export const enrollmentTokenCourses = pgTable(
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
export const tutorCourses = pgTable(
  "tutor_courses",
  {
    id: text("id").primaryKey(),
    tutorId: text("tutor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("tutor_courses_tutor_idx").on(table.tutorId),
    index("tutor_courses_course_idx").on(table.courseId),
  ]
);

// Tutor Slots Table (Weekly empty slots listed by tutors)
export const tutorSlots = pgTable(
  "tutor_slots",
  {
    id: text("id").primaryKey(),
    tutorId: text("tutor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    dayOfWeek: text("day_of_week").notNull(), // 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
    startTime: text("start_time").notNull(), // '09:00'
    endTime: text("end_time").notNull(), // '10:30'
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("tutor_slots_tutor_idx").on(table.tutorId),
  ]
);

// Bookings Table (Appointments chosen by students)
export const bookings = pgTable(
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
    bookedAt: timestamp("booked_at").defaultNow().notNull(),
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

// ─────────────────────────────────────────────────────────────────────────────
// AI Knowledge Domain
// ─────────────────────────────────────────────────────────────────────────────

// Enums for AI domain
export const aiSourceTypeEnum = pgEnum("ai_source_type", ["markdown", "json", "pdf_extraction"]);
export const aiJobStatusEnum = pgEnum("ai_job_status", ["pending", "processing", "completed", "failed"]);
export const aiDifficultyEnum = pgEnum("ai_difficulty", ["easy", "medium", "hard"]);
export const aiQuestionTypeEnum = pgEnum("ai_question_type", ["multiple_choice", "multiple_choices"]);
export const aiReviewStatusEnum = pgEnum("ai_review_status", ["generated", "reviewed", "published", "flagged", "retired"]);
export const quizCategoryEnum = pgEnum("quiz_category", ["daily", "weekly", "chapter", "premium"]);
export const quizVisibilityEnum = pgEnum("quiz_visibility", ["free", "paid"]);
export const quizAttemptStatusEnum = pgEnum("quiz_attempt_status", ["in_progress", "completed", "abandoned"]);

// A. ai_material_instances — top-level knowledge asset metadata
export const aiMaterialInstances = pgTable(
  "ai_material_instances",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    sourceType: aiSourceTypeEnum("source_type").notNull(),
    summary: text("summary").notNull(),
    learningObjectives: jsonb("learning_objectives").default([]).notNull(),
    keywords: jsonb("keywords").default([]).notNull(),
    pineconeSyncStatus: text("pinecone_sync_status").default("pending").notNull(),
    lastSyncError: text("last_sync_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("ai_instances_course_idx").on(table.courseId),
  ]
);

// B. ai_material_instance_sections — groups chunks by subtopic
export const aiMaterialInstanceSections = pgTable(
  "ai_material_instance_sections",
  {
    id: text("id").primaryKey(),
    materialInstanceId: text("material_instance_id")
      .notNull()
      .references(() => aiMaterialInstances.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }),
    orderIndex: integer("order_index").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_sections_instance_idx").on(table.materialInstanceId, table.orderIndex),
  ]
);

// C. ai_material_instance_chunks — physical text segments synced with Pinecone
export const aiMaterialInstanceChunks = pgTable(
  "ai_material_instance_chunks",
  {
    id: text("id").primaryKey(),
    sectionId: text("section_id")
      .notNull()
      .references(() => aiMaterialInstanceSections.id, { onDelete: "cascade" }),
    chunkText: text("chunk_text").notNull(),
    orderIndex: integer("order_index").notNull(),
    pineconeVectorId: text("pinecone_vector_id").notNull(),
    isSynced: boolean("is_synced").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_chunks_section").on(table.sectionId, table.orderIndex),
  ]
);

// D. ai_generation_jobs — tracks background Gemini generation requests
export const aiGenerationJobs = pgTable(
  "ai_generation_jobs",
  {
    id: text("id").primaryKey(),
    tutorId: text("tutor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    status: aiJobStatusEnum("status").default("pending").notNull(),
    promptParameters: jsonb("prompt_parameters").notNull(),
    targetCount: integer("target_count").notNull(),
    generatedCount: integer("generated_count").default(0).notNull(),
    tokenUsage: integer("token_usage").default(0).notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_jobs_status").on(table.courseId, table.status),
  ]
);

// E. ai_question_bank — permanent, reusable question repository
export const aiQuestionBank = pgTable(
  "ai_question_bank",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    sourceSectionId: text("source_section_id")
      .references(() => aiMaterialInstanceSections.id, { onDelete: "set null" }),
    difficulty: aiDifficultyEnum("difficulty").default("medium").notNull(),
    questionType: aiQuestionTypeEnum("question_type").default("multiple_choice").notNull(),
    tags: jsonb("tags").default([]).notNull(),
    prompt: text("prompt").notNull(),
    options: jsonb("options").notNull(),
    correctIndices: jsonb("correct_indices").notNull(),
    explanation: text("explanation").notNull(),
    reviewStatus: aiReviewStatusEnum("review_status").default("generated").notNull(),
    qualityScore: real("quality_score").default(1.0).notNull(),
    useCount: integer("use_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_qbank_selection").on(table.courseId, table.reviewStatus, table.difficulty, table.useCount),
    index("idx_qbank_tags").using("gin", table.tags),
  ]
);

// F. quiz_templates — publishable quiz configurations with selection rules
export const quizTemplates = pgTable(
  "quiz_templates",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    category: quizCategoryEnum("category").notNull(),
    visibility: quizVisibilityEnum("visibility").default("free").notNull(),
    timeLimitSeconds: integer("time_limit_seconds"),
    maxAttempts: integer("max_attempts"),
    selectionRules: jsonb("selection_rules").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_templates_search").on(table.courseId, table.category, table.visibility),
  ]
);

// G. student_quiz_attempts — user quiz session with deep question snapshots
export const studentQuizAttempts = pgTable(
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
    status: quizAttemptStatusEnum("status").default("in_progress").notNull(),
    questionsSnapshot: jsonb("questions_snapshot").notNull(),
    answersSnapshot: jsonb("answers_snapshot"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    submittedAt: timestamp("submitted_at"),
  },
  (table) => [
    index("idx_attempts_student").on(table.studentId, table.status),
    index("idx_attempts_completed").on(table.templateId, table.score).where(sql`"status" = 'completed'`),
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