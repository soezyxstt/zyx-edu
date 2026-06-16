"use server";

/**
 * app/admin/notifications/actions.ts
 *
 * Server actions for the admin notifications management page.
 * All actions enforce admin role before executing.
 */

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { notifications, courses } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { sendAdminBroadcast } from "@/lib/notifications/send";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BroadcastFormState {
 success?: boolean;
 error?: string;
 result?: {
 attempted: number;
 succeeded: number;
 failedCount: number;
 };
}

// ─── Admin guard ──────────────────────────────────────────────────────────────

async function requireAdmin() {
 const session = await auth.api.getSession({ headers: await headers() });
 if (!session?.user || session.user.role !== "admin") {
 throw new Error("Unauthorized ; admin only");
 }
 return session.user;
}

// ─── Send broadcast action ────────────────────────────────────────────────────

/**
 * Sends a push notification to the selected target audience.
 * Called from the admin notifications form.
 */
export async function sendBroadcastAction(
 _prevState: BroadcastFormState,
 formData: FormData
): Promise<BroadcastFormState> {
 try {
 await requireAdmin();

 const title = formData.get("title")?.toString().trim() ?? "";
 const body = formData.get("body")?.toString().trim() ?? "";
 const link = formData.get("link")?.toString().trim() || "/dashboard";
 const target = formData.get("target")?.toString() ?? "all";
 const targetId = formData.get("targetId")?.toString() ?? "";

 if (!title || !body) {
 return { error: "Judul dan isi notifikasi wajib diisi." };
 }

 let resolvedTarget: "all" | string[];
 if (target === "all") {
 resolvedTarget = "all";
 } else if (target === "course" && targetId) {
 // Fetch enrolled user IDs for the course
 const { enrollments } = await import("@/db/schema");
 const enrolled = await db
 .select({ userId: enrollments.userId })
 .from(enrollments)
 .where(eq(enrollments.courseId, targetId));
 resolvedTarget = enrolled.map((e) => e.userId);
 } else if (target === "user" && targetId) {
 resolvedTarget = [targetId];
 } else {
 return { error: "Target tidak valid." };
 }

 const result = await sendAdminBroadcast(title, body, link, resolvedTarget);

 return {
 success: true,
 result: {
 attempted: result.attempted,
 succeeded: result.succeeded,
 failedCount: result.failedTokens.length,
 },
 };
 } catch (err) {
 console.error("[sendBroadcastAction]", err);
 return { error: err instanceof Error ? err.message : "Terjadi kesalahan." };
 }
}

// ─── Get notification history ─────────────────────────────────────────────────

/**
 * Fetches the global notification history (all users) for the admin table.
 * Limited to recent 100 records.
 */
export async function getNotificationHistoryAction(
 page = 1,
 limit = 50
): Promise<{ id: string; userId: string; title: string; type: string; read: boolean; createdAt: Date }[]> {
 await requireAdmin();

 const offset = (page - 1) * limit;

 const rows = await db
 .select({
 id: notifications.id,
 userId: notifications.userId,
 title: notifications.title,
 type: notifications.type,
 read: notifications.read,
 createdAt: notifications.createdAt,
 })
 .from(notifications)
 .orderBy(desc(notifications.createdAt))
 .limit(limit)
 .offset(offset);

 return rows;
}

// ─── Get courses for targeting ────────────────────────────────────────────────

/**
 * Returns all courses for the course targeting dropdown.
 */
export async function getCoursesForTargetingAction(): Promise<{ id: string; title: string }[]> {
 await requireAdmin();

 return db.select({ id: courses.id, title: courses.title }).from(courses);
}
