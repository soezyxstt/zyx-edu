/**
 * Seed historical snapshots to test and verify concept trends.
 * Run with: npx tsx scripts/seed-trends.ts
 */
import "dotenv/config";
import { db } from "../lib/db/index";
import { recomputeMastery, recomputeTrends } from "../lib/mastery-store";
import { studentConceptMastery, studentConceptMasteryHistory, enrollments, user as userTable, knowledgeObjects, courses } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";

async function main() {
  console.log("Starting trend seed and verification...");

  // Find any active student
  const [studentRow] = await db
    .select({
      id: userTable.id,
      name: userTable.name,
    })
    .from(userTable)
    .where(eq(userTable.role, "student"))
    .limit(1);

  if (!studentRow) {
    console.error("No test students found. Please add a test student first.");
    process.exit(1);
  }

  const studentId = studentRow.id;
  const studentName = studentRow.name;
  const courseId = "course-rag-eval";

  console.log(`Using active student: ${studentName} (${studentId})`);

  // Ensure course-rag-eval course exists in the database
  await db
    .insert(courses)
    .values({
      id: courseId,
      title: "RAG Evaluation Course",
      category: "Test" as any,
      description: "Test course for RAG and mastery",
    })
    .onConflictDoNothing();

  // Ensure student is enrolled in course-rag-eval
  const [existingEnrollment] = await db
    .select()
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, studentId),
        eq(enrollments.courseId, courseId)
      )
    )
    .limit(1);

  if (!existingEnrollment) {
    await db.insert(enrollments).values({
      id: randomUUID(),
      userId: studentId,
      courseId: courseId,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
    });
    console.log(`Enrolled student ${studentName} in course: ${courseId}`);
  } else {
    console.log(`Student ${studentName} is already enrolled in course: ${courseId}`);
  }

  // 1. Recompute live mastery to ensure database rows exist
  await recomputeMastery(studentId, courseId);

  // 2. Fetch the active concepts in the course
  const activeKOs = await db
    .select({ conceptName: knowledgeObjects.conceptName })
    .from(knowledgeObjects)
    .where(and(eq(knowledgeObjects.courseId, courseId), eq(knowledgeObjects.status, "active")))
    .limit(3);

  if (activeKOs.length < 3) {
    console.error("Course must have at least 3 active concepts to test trends.");
    process.exit(1);
  }

  const conceptsToTest = activeKOs.map((ko) => ko.conceptName.trim());
  console.log(`Concepts selected for trend testing:`, conceptsToTest);

  // 3. Clear existing trend snapshots for these concepts to ensure clean state
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  await db
    .delete(studentConceptMasteryHistory)
    .where(
      and(
        eq(studentConceptMasteryHistory.studentId, studentId),
        eq(studentConceptMasteryHistory.courseId, courseId),
        eq(studentConceptMasteryHistory.snapshotDate, sevenDaysAgoStr)
      )
    );

  // 4. Force/set the current mastery score to 60 for all 3 concepts
  const now = new Date();
  for (const conceptName of conceptsToTest) {
    await db
      .insert(studentConceptMastery)
      .values({
        id: randomUUID(),
        studentId,
        courseId,
        conceptName,
        masteryScore: 60,
        confidence: 80,
        evidenceCount: 3,
        lastEvidenceAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          studentConceptMastery.studentId,
          studentConceptMastery.courseId,
          studentConceptMastery.conceptName,
        ],
        set: {
          masteryScore: 60,
          confidence: 80,
          evidenceCount: 3,
          updatedAt: now,
        },
      });
  }

  // 5. Seed historical snapshots 7 days ago
  // Concept 0: snap score = 50 -> improving (60 - 50 = +10 >= 5)
  // Concept 1: snap score = 70 -> declining (60 - 70 = -10 <= -5)
  // Concept 2: snap score = 60 -> stable (60 - 60 = 0)
  const snapshotScores = [50, 70, 60];
  const expectedTrends = ["improving", "declining", "stable"] as const;

  for (let i = 0; i < 3; i++) {
    await db
      .insert(studentConceptMasteryHistory)
      .values({
        id: randomUUID(),
        studentId,
        courseId,
        conceptName: conceptsToTest[i],
        masteryScore: snapshotScores[i],
        confidence: 80,
        snapshotDate: sevenDaysAgoStr,
      })
      .onConflictDoNothing();
  }

  console.log(`Seeded snapshots for 7 days ago (${sevenDaysAgoStr}) with scores:`, snapshotScores);

  // 6. Run recomputeTrends to compute trends
  await recomputeTrends(studentId);
  console.log("Trend computation executed.");

  // 7. Verify the trend outcome
  const updatedRows = await db
    .select()
    .from(studentConceptMastery)
    .where(
      and(
        eq(studentConceptMastery.studentId, studentId),
        eq(studentConceptMastery.courseId, courseId)
      )
    );

  let allPassed = true;
  for (let i = 0; i < 3; i++) {
    const conceptName = conceptsToTest[i];
    const row = updatedRows.find((r) => r.conceptName.trim() === conceptName);
    const expected = expectedTrends[i];
    const actual = row?.trend ?? null;

    const passed = actual === expected;
    console.log(
      `Concept: "${conceptName}" | Current Score: 60 | Snapshot Score: ${snapshotScores[i]} | Expected Trend: "${expected}" | Actual Trend: "${actual}" | ${passed ? "✓ PASS" : "✗ FAIL"}`
    );
    if (!passed) {
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log("\nAll trend verifications PASSED successfully!");
    process.exit(0);
  } else {
    console.error("\nSome trend verifications FAILED!");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("seed-trends failed:", err);
  process.exit(1);
});
