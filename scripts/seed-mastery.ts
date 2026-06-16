/**
 * Seed mastery for 5 test students and verify stored vs on-the-fly scores.
 * Run with: npx tsx scripts/seed-mastery.ts
 */
import 'dotenv/config';
import { db } from '../lib/db/index';
import { recomputeMastery, getMastery } from '../lib/mastery-store';
import { AnalyticsService } from '../lib/analytics-service';
import { enrollments, user as userTable, knowledgeObjects } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';

async function main() {
 // Find up to 5 enrolled students across any course
 const rows = await db
 .select({
 studentId: enrollments.userId,
 courseId: enrollments.courseId,
 studentName: userTable.name,
 })
 .from(enrollments)
 .innerJoin(userTable, eq(enrollments.userId, userTable.id))
 .where(gt(enrollments.expiresAt, new Date()))
 .limit(5);

 if (rows.length === 0) {
 console.log('No active enrollments found. Add test students before running this script.');
 process.exit(0);
 }

 let passCount = 0;
 let failCount = 0;

 for (const { studentId, courseId, studentName } of rows) {
 console.log(`\nStudent: ${studentName} (${studentId}) ; Course: ${courseId}`);

 // 1. Recompute and store
 await recomputeMastery(studentId, courseId);

 // 2. Get on-the-fly metrics
 const live = await AnalyticsService.calculateCourseMastery(studentId, courseId);

 // 3. Get stored rows
 const stored = await getMastery(studentId, courseId);

 if (stored.length === 0) {
 console.log(' No stored mastery rows (student has no quiz/flashcard data).');
 continue;
 }

 // Build conceptName → conceptId mapping to look up live scores
 const kos = await db
 .select({ conceptId: knowledgeObjects.conceptId, conceptName: knowledgeObjects.conceptName })
 .from(knowledgeObjects)
 .where(and(eq(knowledgeObjects.courseId, courseId), eq(knowledgeObjects.status, 'active')));
 const nameToConceptId = new Map(kos.map((k) => [k.conceptName.trim(), k.conceptId]));

 let allMatch = true;
 for (const row of stored) {
 const conceptId = nameToConceptId.get(row.conceptName);
 const liveEntry = conceptId ? live[conceptId] : undefined;

 if (!liveEntry) continue;

 const diff = Math.abs(liveEntry.masteryScore - row.masteryScore);
 const pass = diff <= 2;
 console.log(
 ` ${pass ? '✓' : '✗'} ${row.conceptName}: stored=${row.masteryScore}, live=${liveEntry.masteryScore}, diff=${diff}`
 );
 if (!pass) allMatch = false;
 }

 if (allMatch) passCount++;
 else failCount++;
 }

 console.log(`\nResult: ${passCount} pass, ${failCount} fail out of ${rows.length} students.`);
 process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
 console.error('seed-mastery failed:', err.message || err);
 process.exit(1);
});
