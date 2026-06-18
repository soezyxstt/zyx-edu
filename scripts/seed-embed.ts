/**
 * E0: seed + verify the Learning Context Fabric.
 * Builds a course with prerequisite chain A -> B -> C, typed KOs per concept,
 * and mastery A=80, B=25, C=10, then asserts lib/learning-context output.
 * Run with: bunx tsx scripts/seed-embed.ts
 */
import "dotenv/config";
import { db } from "../lib/db/index";
import {
  courses,
  masterTeachingDocuments,
  chapters,
  concepts,
  conceptLocalizations,
  knowledgeObjects,
  knowledgeRelationships,
  studentConceptMastery,
  user as userTable,
} from "../db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getLearningContext, getCourseGraphDbHits, invalidateLearningContext } from "../lib/learning-context";

const COURSE_ID = "embed-test-course";
const STUDENT_ID = "embed-test-student";
const MTD_ID = "embed-test-mtd";
const CHAPTER_ID = "embed-test-chapter";

// Concept definitions: name + the prerequisite it depends on + mastery to seed.
const CONCEPTS = [
  { key: "A", name: "Embed Concept A", prereq: null, mastery: 80 },
  { key: "B", name: "Embed Concept B", prereq: "A", mastery: 25 },
  { key: "C", name: "Embed Concept C", prereq: "B", mastery: 10 },
];

// KO types seeded per concept, with importance to verify sort order.
const KO_SPECS: Array<{
  type: "definition" | "formula" | "example" | "misconception";
  importance: "high" | "medium" | "low";
  order: number;
}> = [
  { type: "formula", importance: "low", order: 1 },
  { type: "definition", importance: "high", order: 2 },
  { type: "definition", importance: "high", order: 1 },
  { type: "example", importance: "medium", order: 3 },
  { type: "misconception", importance: "medium", order: 4 },
];

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean) {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${label}`);
  }
}

async function main() {
  console.log("E0 learning-context seed starting...");

  // Clean prior KOs/mastery for this course (relationships cascade on KO delete).
  await db.delete(knowledgeObjects).where(eq(knowledgeObjects.courseId, COURSE_ID));
  await db.delete(studentConceptMastery).where(eq(studentConceptMastery.courseId, COURSE_ID));

  await db
    .insert(userTable)
    .values({
      id: STUDENT_ID,
      name: "Embed Test Student",
      email: "embed-test@zyx.local",
      emailVerified: true,
      role: "student",
    })
    .onConflictDoNothing();

  await db
    .insert(courses)
    .values({ id: COURSE_ID, title: "Embed Test Course", category: "Test" as never, description: "E0 fabric test" })
    .onConflictDoNothing();

  await db
    .insert(masterTeachingDocuments)
    .values({
      id: MTD_ID,
      courseId: COURSE_ID,
      title: "Embed Test MTD",
      markdownContent: "# test",
      status: "active",
      createdById: STUDENT_ID,
    })
    .onConflictDoNothing();

  await db
    .insert(chapters)
    .values({ id: CHAPTER_ID, courseId: COURSE_ID, title: "Embed Test Chapter", orderIndex: 1, status: "published" })
    .onConflictDoNothing();

  // Concepts + localizations + KOs. Keep a name -> first KO id map for edges.
  const firstKoIdByConcept = new Map<string, string>();

  for (const c of CONCEPTS) {
    const conceptId = `embed-concept-${c.key}`;
    await db
      .insert(concepts)
      .values({ id: conceptId, canonicalSlug: `embed-${c.key.toLowerCase()}`, isVerified: true })
      .onConflictDoNothing();
    await db
      .insert(conceptLocalizations)
      .values({ id: `${conceptId}-loc`, conceptId, lang: "id", displayName: c.name, aliases: [] })
      .onConflictDoNothing();

    for (let i = 0; i < KO_SPECS.length; i++) {
      const spec = KO_SPECS[i];
      const koId = `embed-ko-${c.key}-${i}`;
      if (!firstKoIdByConcept.has(c.name)) firstKoIdByConcept.set(c.name, koId);
      await db.insert(knowledgeObjects).values({
        id: koId,
        courseId: COURSE_ID,
        mtdId: MTD_ID,
        chapterId: CHAPTER_ID,
        conceptId,
        learningOrder: spec.order,
        title: `${c.name} ${spec.type} ${i}`,
        conceptName: c.name,
        content: `Content for ${c.name} ${spec.type}`,
        type: spec.type,
        difficulty: "medium",
        bloomLevel: "understand",
        importance: spec.importance,
        metadata: spec.type === "definition" ? { analogy: "like a recipe", pitfall: "do not skip steps" } : {},
        status: "active",
      });
    }
  }

  // Prerequisite edges B requires A, C requires B (source -> target = prereq -> dependent).
  for (const c of CONCEPTS) {
    if (!c.prereq) continue;
    const prereqConcept = CONCEPTS.find((x) => x.key === c.prereq)!;
    await db.insert(knowledgeRelationships).values({
      id: `embed-rel-${c.prereq}-${c.key}`,
      sourceKoId: firstKoIdByConcept.get(prereqConcept.name)!,
      targetKoId: firstKoIdByConcept.get(c.name)!,
      type: "prerequisite",
    });
  }
  // One related edge A <-> C to verify related collapse.
  await db.insert(knowledgeRelationships).values({
    id: "embed-rel-A-C-related",
    sourceKoId: firstKoIdByConcept.get("Embed Concept A")!,
    targetKoId: firstKoIdByConcept.get("Embed Concept C")!,
    type: "related",
  });

  // Mastery rows.
  const now = new Date();
  for (const c of CONCEPTS) {
    await db
      .insert(studentConceptMastery)
      .values({
        id: randomUUID(),
        studentId: STUDENT_ID,
        courseId: COURSE_ID,
        conceptName: c.name,
        masteryScore: c.mastery,
        confidence: 70,
        evidenceCount: 4,
        trend: "stable",
        lastEvidenceAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [studentConceptMastery.studentId, studentConceptMastery.courseId, studentConceptMastery.conceptName],
        set: { masteryScore: c.mastery, confidence: 70, evidenceCount: 4, trend: "stable", updatedAt: now },
      });
  }

  // ── Assertions ──────────────────────────────────────────────────────────────
  invalidateLearningContext(COURSE_ID);
  const before = getCourseGraphDbHits();

  const ctxB = await getLearningContext(STUDENT_ID, COURSE_ID, { conceptName: "Embed Concept B" });
  const ctxC = await getLearningContext(STUDENT_ID, COURSE_ID, { conceptName: "Embed Concept C" });

  const after = getCourseGraphDbHits();

  console.log("\nE0.1 mastery values");
  check("B mastery score is 25", ctxB.mastery.score === 25);
  check("B trend is stable", ctxB.mastery.trend === "stable");
  check("B evidence count is 4", ctxB.mastery.evidenceCount === 4);
  check("C mastery score is 10", ctxC.mastery.score === 10);

  console.log("\nE0.2 blockedBy under threshold 40");
  check("B prerequisites = [A]", ctxB.prerequisites.length === 1 && ctxB.prerequisites[0] === "Embed Concept A");
  check("B blockedBy is empty (A=80)", ctxB.blockedBy.length === 0);
  check("C prerequisites = [B]", ctxC.prerequisites.length === 1 && ctxC.prerequisites[0] === "Embed Concept B");
  check("C blockedBy = [B] (B=25 < 40)", ctxC.blockedBy.length === 1 && ctxC.blockedBy[0] === "Embed Concept B");
  check("C related includes A", ctxC.related.includes("Embed Concept A"));

  console.log("\nE0.3 KO bucketing + sort");
  check("B has 2 definition KOs", ctxB.kos.definition.length === 2);
  check("B has 1 formula KO", ctxB.kos.formula.length === 1);
  check("B has 1 example KO", ctxB.kos.example.length === 1);
  check("B has 1 misconception KO", ctxB.kos.misconception.length === 1);
  // Sort: definitions are importance=high; among them learningOrder 1 then 2.
  check(
    "definition KOs sorted by learningOrder",
    ctxB.kos.definition[0].title.endsWith("2") && ctxB.kos.definition[1].title.endsWith("1"),
  );
  check("definition KO exposes analogy from metadata", ctxB.kos.definition[0].analogy === "like a recipe");

  console.log("\nE0.4 query budget (cache)");
  check("two calls, same course, one DB graph fetch", after - before === 1);

  console.log(`\nE0 result: ${pass} pass, ${fail} fail.`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("seed-embed failed:", err);
  process.exit(1);
});
