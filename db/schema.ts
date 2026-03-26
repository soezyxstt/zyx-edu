import { pgTable, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "teacher", "student"]);

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: roleEnum("role").default("student"),
  image: text("image"),
});

export const courses = pgTable("courses", {
  id: text("id").primaryKey(),
  title: text("title").notNull(), // e.g., "Calculus I"
  category: text("category").notNull(), // e.g., "TPB" or "Major"
});

export const progress = pgTable("progress", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  materialId: text("material_id"),
  status: text("status").default("completed"),
  completedAt: timestamp("completed_at").defaultNow(),
});