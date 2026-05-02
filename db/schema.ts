import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  integer,
  jsonb,
  boolean,
  index,
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