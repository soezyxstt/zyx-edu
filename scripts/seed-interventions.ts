import 'dotenv/config';
import { db } from "../lib/db/index";
import { enrollments, user as userTable, learningEvents, interventions, studentConceptMastery, knowledgeObjects } from "../db/schema";
import { evaluateInterventions } from "../lib/intervention-service";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";

async function main() {
  console.log("Starting seed and verification script for interventions...");

  // 1. Find a course that has active KOs
  const [koRow] = await db
    .select({ courseId: knowledgeObjects.courseId })
    .from(knowledgeObjects)
    .where(eq(knowledgeObjects.status, "active"))
    .limit(1);

  if (!koRow) {
    console.error("No active KOs found in database. Seed KOs first.");
    process.exit(1);
  }

  const courseId = koRow.courseId;

  // 2. Find an enrollment for this course
  const [enrollment] = await db
    .select({
      studentId: enrollments.userId,
      studentName: userTable.name,
    })
    .from(enrollments)
    .innerJoin(userTable, eq(enrollments.userId, userTable.id))
    .where(eq(enrollments.courseId, courseId))
    .limit(1);

  if (!enrollment) {
    console.error(`No active enrollment found for course ${courseId}`);
    process.exit(1);
  }

  const { studentId, studentName } = enrollment;
  console.log(`Using Student: ${studentName} (${studentId}) on Course: ${courseId}`);

  // Fetch two active concepts from this course
  const kos = await db
    .select({ conceptName: knowledgeObjects.conceptName })
    .from(knowledgeObjects)
    .where(and(eq(knowledgeObjects.courseId, courseId), eq(knowledgeObjects.status, "active")))
    .limit(2);

  const concept1 = kos[0]?.conceptName || "Limit intuitif";
  const concept2 = kos[1]?.conceptName || "Definisi epsilon-delta";
  console.log(`Testing with Concept 1: "${concept1}" and Concept 2: "${concept2}"`);

  // Cleanup existing test interventions and learning events for clean run
  await db.delete(interventions).where(
    and(
      eq(interventions.studentId, studentId),
      eq(interventions.courseId, courseId)
    )
  );

  await db.delete(learningEvents).where(
    and(
      eq(learningEvents.studentId, studentId),
      eq(learningEvents.courseId, courseId),
      eq(learningEvents.conceptName, concept1)
    )
  );

  await db.delete(studentConceptMastery).where(
    and(
      eq(studentConceptMastery.studentId, studentId),
      eq(studentConceptMastery.courseId, courseId)
    )
  );

  let passes = 0;
  let fails = 0;

  const assert = (condition: boolean, message: string) => {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passes++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      fails++;
    }
  };

  // -------------------------------------------------------------
  // Test Scenario 1: Rule 1 (3 consecutive failures)
  // -------------------------------------------------------------
  console.log("\nTesting Scenario 1: Rule 1 (3 consecutive failures)...");
  
  // Insert 3 failing events
  const now = new Date();
  await db.insert(learningEvents).values([
    {
      id: randomUUID(),
      studentId,
      courseId,
      conceptName: concept1,
      eventType: "quiz_answer",
      correctness: 0,
      createdAt: new Date(now.getTime() - 3000),
    },
    {
      id: randomUUID(),
      studentId,
      courseId,
      conceptName: concept1,
      eventType: "quiz_answer",
      correctness: 0,
      createdAt: new Date(now.getTime() - 2000),
    },
    {
      id: randomUUID(),
      studentId,
      courseId,
      conceptName: concept1,
      eventType: "quiz_answer",
      correctness: 0,
      createdAt: new Date(now.getTime() - 1000),
    },
  ]);

  await evaluateInterventions(studentId, courseId);

  const activeLimitInterventions = await db
    .select()
    .from(interventions)
    .where(
      and(
        eq(interventions.studentId, studentId),
        eq(interventions.conceptName, concept1),
        eq(interventions.status, "active")
      )
    );

  assert(activeLimitInterventions.length === 1, `Should create exactly 1 active intervention for "${concept1}"`);
  assert(
    activeLimitInterventions[0]?.reason === "3 consecutive quiz failures",
    "Reason should be '3 consecutive quiz failures'"
  );

  // -------------------------------------------------------------
  // Test Scenario 2: Rule 2 (Low and declining mastery)
  // -------------------------------------------------------------
  console.log("\nTesting Scenario 2: Rule 2 (Low and declining mastery)...");

  // Insert low and declining mastery row
  await db.insert(studentConceptMastery).values({
    id: randomUUID(),
    studentId,
    courseId,
    conceptName: concept2,
    masteryScore: 25,
    confidence: 80,
    evidenceCount: 4,
    trend: "declining",
    lastEvidenceAt: new Date(),
  });

  await evaluateInterventions(studentId, courseId);

  const activeTurunanInterventions = await db
    .select()
    .from(interventions)
    .where(
      and(
        eq(interventions.studentId, studentId),
        eq(interventions.conceptName, concept2),
        eq(interventions.status, "active")
      )
    );

  assert(activeTurunanInterventions.length === 1, `Should create exactly 1 active intervention for "${concept2}"`);
  assert(
    activeTurunanInterventions[0]?.reason === "low and declining mastery",
    "Reason should be 'low and declining mastery'"
  );

  // -------------------------------------------------------------
  // Test Scenario 3: Resolution
  // -------------------------------------------------------------
  console.log("\nTesting Scenario 3: Resolution...");

  // Update mastery of concept1 to > 60
  await db.insert(studentConceptMastery).values({
    id: randomUUID(),
    studentId,
    courseId,
    conceptName: concept1,
    masteryScore: 68,
    confidence: 90,
    evidenceCount: 5,
    trend: "improving",
    lastEvidenceAt: new Date(),
  }).onConflictDoUpdate({
    target: [
      studentConceptMastery.studentId,
      studentConceptMastery.courseId,
      studentConceptMastery.conceptName
    ],
    set: {
      masteryScore: 68,
      trend: "improving",
    }
  });

  await evaluateInterventions(studentId, courseId);

  const resolvedLimitInterventions = await db
    .select()
    .from(interventions)
    .where(
      and(
        eq(interventions.studentId, studentId),
        eq(interventions.conceptName, concept1),
        eq(interventions.status, "resolved")
      )
    );

  assert(resolvedLimitInterventions.length === 1, `"${concept1}" intervention should flip to resolved`);
  assert(resolvedLimitInterventions[0]?.resolvedAt !== null, "resolvedAt timestamp should be populated");

  // -------------------------------------------------------------
  // Test Scenario 4: Deduplication / No duplicate row
  // -------------------------------------------------------------
  console.log("\nTesting Scenario 4: Deduplication / No duplicate row...");

  // Try to evaluate again when active row exists
  await evaluateInterventions(studentId, courseId);

  const allTurunanInterventions = await db
    .select()
    .from(interventions)
    .where(
      and(
        eq(interventions.studentId, studentId),
        eq(interventions.conceptName, concept2)
      )
    );

  assert(allTurunanInterventions.length === 1, `Should still have exactly 1 intervention for "${concept2}" (no duplicates)`);

  console.log(`\nIntervention Seeding Results: ${passes} passes, ${fails} fails.`);
  process.exit(fails > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Verification script failed:", err);
  process.exit(1);
});
