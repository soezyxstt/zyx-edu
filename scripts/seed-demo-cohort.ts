/**
 * Seed 20 demo students into the first available course with deterministic mastery scores.
 * 2 concepts are engineered to be weak (top-2 in analytics), others are decent.
 * Run with: bunx tsx scripts/seed-demo-cohort.ts
 *
 * Safe to re-run: mastery rows are upserted, student rows skip on conflict.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { db } from "../lib/db/index";
import {
  user as userTable,
  enrollments,
  studentConceptMastery,
  learningEvents,
  courses,
} from "../db/schema";
import { eq, and, gt } from "drizzle-orm";

const SEED_EMAIL_PREFIX = "demo-student-";
const SEED_EMAIL_SUFFIX = "@seed.local";
const STUDENT_COUNT = 20;

// Concept definitions: [name, baseLow, baseHigh]
// For weak concepts, baseHigh < 30; for strong, base > 60.
const CONCEPTS: [string, number, number][] = [
  ["Konsep Lemah Alpha", 5, 22],
  ["Konsep Lemah Beta", 10, 28],
  ["Konsep Sedang Gamma", 40, 65],
  ["Konsep Sedang Delta", 45, 68],
  ["Konsep Kuat Epsilon", 62, 88],
  ["Konsep Kuat Zeta", 68, 92],
];

function seededInt(base: number, range: number, index: number): number {
  return base + (index % Math.max(range, 1));
}

async function main() {
  // 1. Find first course
  const [course] = await db
    .select({ id: courses.id, title: courses.title })
    .from(courses)
    .limit(1);

  if (!course) {
    console.error("No courses found. Create at least one course before seeding.");
    process.exit(1);
  }
  console.log(`Seeding into course: "${course.title}" (${course.id})`);

  const now = new Date();
  const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const studentIds: string[] = [];

  // 2. Create or find 20 demo students
  for (let i = 1; i <= STUDENT_COUNT; i++) {
    const email = `${SEED_EMAIL_PREFIX}${String(i).padStart(2, "0")}${SEED_EMAIL_SUFFIX}`;

    await db
      .insert(userTable)
      .values({
        id: randomUUID(),
        name: `Demo Student ${String(i).padStart(2, "0")}`,
        email,
        emailVerified: false,
        role: "student",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    const [existing] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1);

    if (!existing) {
      console.error(`Failed to create or find user for ${email}`);
      process.exit(1);
    }

    studentIds.push(existing.id);
  }
  console.log(`${STUDENT_COUNT} demo students ready.`);

  // 3. Enroll students (skip if already enrolled)
  let newEnrollments = 0;
  for (const studentId of studentIds) {
    const [existing] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, studentId),
          eq(enrollments.courseId, course.id),
          gt(enrollments.expiresAt, now)
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(enrollments).values({
        id: randomUUID(),
        userId: studentId,
        courseId: course.id,
        enrolledAt: now,
        expiresAt: oneYearFromNow,
      });
      newEnrollments++;
    }
  }
  console.log(`${newEnrollments} new enrollments created.`);

  // 4. Upsert student_concept_mastery rows
  let masteryRows = 0;
  for (let idx = 0; idx < studentIds.length; idx++) {
    const studentId = studentIds[idx];
    for (const [conceptName, baseLow, baseHigh] of CONCEPTS) {
      const range = baseHigh - baseLow;
      const score = seededInt(baseLow, range, idx);

      await db
        .insert(studentConceptMastery)
        .values({
          id: randomUUID(),
          studentId,
          courseId: course.id,
          conceptName,
          masteryScore: score,
          confidence: 90,
          evidenceCount: 5,
          trend: "stable",
          lastEvidenceAt: threeDaysAgo,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            studentConceptMastery.studentId,
            studentConceptMastery.courseId,
            studentConceptMastery.conceptName,
          ],
          set: {
            masteryScore: score,
            confidence: 90,
            evidenceCount: 5,
            trend: "stable",
            lastEvidenceAt: threeDaysAgo,
            updatedAt: now,
          },
        });
      masteryRows++;
    }
  }
  console.log(`${masteryRows} mastery rows upserted.`);

  // 5. Insert learning_events so all students appear active this week
  let eventRows = 0;
  for (const studentId of studentIds) {
    await db.insert(learningEvents).values({
      id: randomUUID(),
      studentId,
      courseId: course.id,
      conceptName: CONCEPTS[0][0],
      eventType: "quiz_answer",
      correctness: 0.5,
      weight: 1,
      createdAt: threeDaysAgo,
    });
    eventRows++;
  }
  console.log(`${eventRows} learning events inserted.`);

  // 6. Report expected analytics
  console.log("\nExpected analytics:");
  console.log(`  Enrolled: ${STUDENT_COUNT} active students`);
  console.log(`  Active this week: ${STUDENT_COUNT}`);
  for (const [conceptName, baseLow, baseHigh] of CONCEPTS) {
    const scores = Array.from({ length: STUDENT_COUNT }, (_, i) =>
      seededInt(baseLow, baseHigh - baseLow, i)
    );
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    console.log(`  ${conceptName}: avg mastery ${avg}`);
  }
  console.log("\nTop-2 weakest concepts should be Konsep Lemah Alpha and Konsep Lemah Beta.");
  console.log("Done.");
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error("seed-demo-cohort failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
