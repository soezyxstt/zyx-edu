/**
 * Gate 2.3 verification: streak math
 * Usage: npx tsx scripts/seed-streak.ts
 *
 * Tests 3 scenarios against the streak service:
 *   1. Consecutive days  → increments correctly
 *   2. Gap (> 1 day)     → resets to 1
 *   3. Same-day no-op    → does not increment twice
 */

import "dotenv/config";

import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { user, courses, studentStreaks, learningEvents } from "@/db/schema";
import { getOrUpdateStreak } from "@/lib/streak-service";
import { eq, and } from "drizzle-orm";

const TEST_USER_ID = "seed-streak-test-user-p2";
const TEST_USER_EMAIL = "seed-streak-test-p2@internal";

function dateOffset(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

function dateStrOffset(days: number): string {
  return dateOffset(days).toISOString().slice(0, 10);
}

async function ensureTestUser(): Promise<string> {
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, TEST_USER_EMAIL))
    .limit(1);
  if (existing) return existing.id;

  await db.insert(user).values({
    id: TEST_USER_ID,
    name: "Seed Streak Test",
    email: TEST_USER_EMAIL,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: "student",
  });
  return TEST_USER_ID;
}

async function findAnyCourseId(): Promise<string | null> {
  const [c] = await db.select({ id: courses.id }).from(courses).limit(1);
  return c?.id ?? null;
}

async function cleanup(studentId: string, courseId: string | null) {
  await db.delete(studentStreaks).where(eq(studentStreaks.studentId, studentId));
  if (courseId) {
    await db
      .delete(learningEvents)
      .where(
        and(
          eq(learningEvents.studentId, studentId),
          eq(learningEvents.courseId, courseId)
        )
      );
  }
}

async function insertEvent(studentId: string, courseId: string, date: Date) {
  await db.insert(learningEvents).values({
    id: randomUUID(),
    studentId,
    courseId,
    eventType: "material_completed",
    weight: 1,
    createdAt: date,
  });
}

async function main() {
  const studentId = await ensureTestUser();
  const courseId = await findAnyCourseId();

  if (!courseId) {
    console.error("No courses in DB. Seed a course first.");
    process.exit(1);
  }

  let passed = 0;
  const today = dateStrOffset(0);
  const yesterday = dateStrOffset(-1);

  // ── Test 1: Consecutive increment ──────────────────────────────────────────
  await cleanup(studentId, courseId);
  // Simulate: last active = yesterday, currentStreak = 5
  await db.insert(studentStreaks).values({
    studentId,
    currentStreak: 5,
    longestStreak: 8,
    lastActiveDate: yesterday,
  });
  // Activity exists today
  await insertEvent(studentId, courseId, dateOffset(0));

  const r1 = await getOrUpdateStreak(studentId);
  const t1 = r1.current === 6 && r1.longest === 8;
  console.log(`Test 1 (consecutive): current=${r1.current} longest=${r1.longest} [${t1 ? "PASS" : "FAIL"}]`);
  if (t1) passed++;

  // ── Test 2: Gap resets to 1 ─────────────────────────────────────────────
  await cleanup(studentId, courseId);
  // last active = 3 days ago, currentStreak = 12
  await db.insert(studentStreaks).values({
    studentId,
    currentStreak: 12,
    longestStreak: 12,
    lastActiveDate: dateStrOffset(-3),
  });
  await insertEvent(studentId, courseId, dateOffset(0));

  const r2 = await getOrUpdateStreak(studentId);
  const t2 = r2.current === 1 && r2.longest === 12;
  console.log(`Test 2 (gap reset):   current=${r2.current} longest=${r2.longest} [${t2 ? "PASS" : "FAIL"}]`);
  if (t2) passed++;

  // ── Test 3: Same-day no-op ──────────────────────────────────────────────
  await cleanup(studentId, courseId);
  // last active = today already, currentStreak = 3
  await db.insert(studentStreaks).values({
    studentId,
    currentStreak: 3,
    longestStreak: 3,
    lastActiveDate: today,
  });
  await insertEvent(studentId, courseId, dateOffset(0));

  const r3a = await getOrUpdateStreak(studentId);
  const r3b = await getOrUpdateStreak(studentId); // second call same day
  const t3 = r3a.current === 3 && r3b.current === 3;
  console.log(`Test 3 (same-day):    current=${r3a.current} / ${r3b.current} [${t3 ? "PASS" : "FAIL"}]`);
  if (t3) passed++;

  // ── Cleanup ────────────────────────────────────────────────────────────────
  await cleanup(studentId, courseId);

  console.log(`\nResult: ${passed}/3`);
  if (passed < 3) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
