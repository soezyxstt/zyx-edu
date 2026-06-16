/**
 * Seed 4 weeks of student_concept_mastery_history for the demo cohort,
 * and seed 2 active interventions on demo-student-01 for Gate 6B.3.
 * Then builds a fresh analytics snapshot.
 *
 * Run after seed-demo-cohort.ts:
 * npx tsx scripts/seed-cohort-history.ts
 *
 * Safe to re-run: history rows use onConflictDoNothing, interventions skip on conflict.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { db } from "../lib/db/index";
import {
 user as userTable,
 courses,
 studentConceptMasteryHistory,
 interventions,
} from "../db/schema";
import { eq } from "drizzle-orm";
import { computeSnapshotPayload } from "../lib/cohort-analytics";

const SEED_EMAIL_PREFIX = "demo-student-";
const SEED_EMAIL_SUFFIX = "@seed.local";
const STUDENT_COUNT = 20;

const CONCEPTS: [string, number, number][] = [
 ["Konsep Lemah Alpha", 5, 22],
 ["Konsep Lemah Beta", 10, 28],
 ["Konsep Sedang Gamma", 40, 65],
 ["Konsep Sedang Delta", 45, 68],
 ["Konsep Kuat Epsilon", 62, 88],
 ["Konsep Kuat Zeta", 68, 92],
];

// Weekly delta applied to weak concepts so trend line has visible slope
const WEEKLY_DELTA: Record<string, number> = {
 "Konsep Lemah Alpha": -3,
 "Konsep Lemah Beta": -2,
};

function weekDate(weeksAgo: number): string {
 const d = new Date();
 d.setDate(d.getDate() - weeksAgo * 7);
 return d.toISOString().slice(0, 10);
}

function clamp(n: number, min: number, max: number) {
 return Math.max(min, Math.min(max, n));
}

async function main() {
 const [course] = await db
 .select({ id: courses.id, title: courses.title })
 .from(courses)
 .limit(1);

 if (!course) {
 console.error("No courses found. Run seed-demo-cohort.ts first.");
 process.exit(1);
 }
 console.log(`Seeding history for course: "${course.title}" (${course.id})`);

 // Collect student IDs
 const studentIds: string[] = [];
 for (let i = 1; i <= STUDENT_COUNT; i++) {
 const email = `${SEED_EMAIL_PREFIX}${String(i).padStart(2, "0")}${SEED_EMAIL_SUFFIX}`;
 const [u] = await db
 .select({ id: userTable.id })
 .from(userTable)
 .where(eq(userTable.email, email))
 .limit(1);
 if (!u) {
 console.warn(`Student ${email} not found ; run seed-demo-cohort.ts first.`);
 continue;
 }
 studentIds.push(u.id);
 }

 if (studentIds.length === 0) {
 console.error("No demo students found.");
 process.exit(1);
 }
 console.log(`Found ${studentIds.length} demo students.`);

 // Seed 4 weeks of history (weeks 4 → 1, oldest first)
 let rows = 0;
 for (const [conceptName, baseLow, baseHigh] of CONCEPTS) {
 const delta = WEEKLY_DELTA[conceptName] ?? 0;
 for (let week = 4; week >= 1; week--) {
 const date = weekDate(week);
 // Week 4 = oldest (most negative delta), week 1 = most recent
 const weekOffset = (4 - week) * delta; // negative delta means improving toward present
 for (let idx = 0; idx < studentIds.length; idx++) {
 const studentId = studentIds[idx];
 const baseScore = baseLow + (idx % Math.max(baseHigh - baseLow, 1));
 const score = clamp(baseScore + weekOffset, 0, 100);

 await db
 .insert(studentConceptMasteryHistory)
 .values({
 id: randomUUID(),
 studentId,
 courseId: course.id,
 conceptName,
 masteryScore: Math.round(score),
 confidence: 80,
 snapshotDate: date,
 })
 .onConflictDoNothing();
 rows++;
 }
 }
 }
 console.log(`${rows} history rows inserted (skipping duplicates).`);

 // Seed 2 active interventions on demo-student-01 for Gate 6B.3
 const targetEmail = `${SEED_EMAIL_PREFIX}01${SEED_EMAIL_SUFFIX}`;
 const [target] = await db
 .select({ id: userTable.id })
 .from(userTable)
 .where(eq(userTable.email, targetEmail))
 .limit(1);

 if (target) {
 for (const conceptName of ["Konsep Lemah Alpha", "Konsep Lemah Beta"]) {
 await db
 .insert(interventions)
 .values({
 id: randomUUID(),
 studentId: target.id,
 courseId: course.id,
 conceptName,
 reason: "Seeded for Gate 6B.3 testing",
 status: "active",
 payload: JSON.stringify({ seeded: true }),
 createdAt: new Date(),
 })
 .onConflictDoNothing();
 }
 console.log(`Seeded 2 interventions for ${targetEmail}.`);
 } else {
 console.warn(`demo-student-01 not found ; skipping interventions.`);
 }

 // Build snapshot
 console.log("Building analytics snapshot...");
 await computeSnapshotPayload(course.id);
 console.log("Snapshot built.");
 console.log("Done.");
 process.exit(0);
}

main().catch((err: unknown) => {
 console.error("seed-cohort-history failed:", err instanceof Error ? err.message : err);
 process.exit(1);
});
