/**
 * E5: seed + verify the concept-graph rollup and cycle-safe root-cause tracer.
 * Graph: Aljabar -> Antiturunan -> Integral, plus a cycle X <-> Y.
 * Run: bunx tsx scripts/seed-graph.ts
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
  conceptGraphEdges,
  user as userTable,
} from "../db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { buildConceptGraph, traceRootCause } from "../lib/graph-trace";

const COURSE_ID = "graph-test-course";
const STUDENT_ID = "graph-test-student";
const MTD_ID = "graph-test-mtd";
const CHAPTER_ID = "graph-test-chapter";

// name, slug, mastery, prereq (KO-level edge source)
const NODES = [
  { key: "ALG", name: "Aljabar Dasar", slug: "graph-aljabar", mastery: 31, prereq: null },
  { key: "ANT", name: "Antiturunan", slug: "graph-antiturunan", mastery: 22, prereq: "ALG" },
  { key: "INT", name: "Integral Tentu", slug: "graph-integral", mastery: 54, prereq: "ANT" },
  // Cycle: X requires Y and Y requires X, both weak.
  { key: "X", name: "Konsep X", slug: "graph-x", mastery: 20, prereq: "Y" },
  { key: "Y", name: "Konsep Y", slug: "graph-y", mastery: 25, prereq: "X" },
];

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean) {
  if (cond) { pass += 1; console.log(`  PASS ${label}`); }
  else { fail += 1; console.log(`  FAIL ${label}`); }
}

async function main() {
  console.log("E5 concept-graph seed starting...");
  await db.delete(knowledgeObjects).where(eq(knowledgeObjects.courseId, COURSE_ID));
  await db.delete(studentConceptMastery).where(eq(studentConceptMastery.courseId, COURSE_ID));
  await db.delete(conceptGraphEdges).where(eq(conceptGraphEdges.courseId, COURSE_ID));

  await db.insert(userTable).values({ id: STUDENT_ID, name: "Graph Student", email: "graph@zyx.local", emailVerified: true, role: "student" }).onConflictDoNothing();
  await db.insert(courses).values({ id: COURSE_ID, title: "Graph Test", category: "Test" as never, description: "E5" }).onConflictDoNothing();
  await db.insert(masterTeachingDocuments).values({ id: MTD_ID, courseId: COURSE_ID, title: "MTD", markdownContent: "# t", status: "active", createdById: STUDENT_ID }).onConflictDoNothing();
  await db.insert(chapters).values({ id: CHAPTER_ID, courseId: COURSE_ID, title: "Ch", orderIndex: 1, status: "published" }).onConflictDoNothing();

  const koByConcept = new Map<string, string>();
  for (const n of NODES) {
    const conceptId = `graph-concept-${n.key}`;
    await db.insert(concepts).values({ id: conceptId, canonicalSlug: n.slug, isVerified: true }).onConflictDoNothing();
    await db.insert(conceptLocalizations).values({ id: `${conceptId}-loc`, conceptId, lang: "id", displayName: n.name, aliases: [] }).onConflictDoNothing();
    const koId = `graph-ko-${n.key}`;
    koByConcept.set(n.key, koId);
    await db.insert(knowledgeObjects).values({
      id: koId, courseId: COURSE_ID, mtdId: MTD_ID, chapterId: CHAPTER_ID, conceptId,
      learningOrder: 1, title: `${n.name} def`, conceptName: n.name, content: `Konten ${n.name}`,
      type: "definition", difficulty: "medium", bloomLevel: "understand", importance: "high", metadata: {}, status: "active",
    });
    await db.insert(studentConceptMastery).values({
      id: randomUUID(), studentId: STUDENT_ID, courseId: COURSE_ID, conceptName: n.name,
      masteryScore: n.mastery, confidence: 60, evidenceCount: 3, trend: "declining", lastEvidenceAt: new Date(), updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [studentConceptMastery.studentId, studentConceptMastery.courseId, studentConceptMastery.conceptName],
      set: { masteryScore: n.mastery },
    });
  }
  for (const n of NODES) {
    if (!n.prereq) continue;
    await db.insert(knowledgeRelationships).values({
      id: `graph-rel-${n.prereq}-${n.key}`,
      sourceKoId: koByConcept.get(n.prereq)!,
      targetKoId: koByConcept.get(n.key)!,
      type: "prerequisite",
    }).onConflictDoNothing();
  }

  // ── E5.1 rollup build ─────────────────────────────────────────────────────────
  console.log("\nE5.1 concept graph rollup");
  const edgeCount = await buildConceptGraph(COURSE_ID);
  const stored = await db.select().from(conceptGraphEdges).where(eq(conceptGraphEdges.courseId, COURSE_ID));
  check("builds concept-level prerequisite edges", edgeCount >= 4 && stored.length === edgeCount);
  check("Antiturunan -> Integral edge present", stored.some((e) => e.sourceConcept === "Antiturunan" && e.targetConcept === "Integral Tentu" && e.type === "prerequisite"));
  // Rebuild is idempotent (dedup): second build yields same count.
  const rebuilt = await buildConceptGraph(COURSE_ID);
  check("rebuild is idempotent (deduped)", rebuilt === edgeCount);

  // ── E5.2 root cause, deepest first, cycle-safe ───────────────────────────────
  console.log("\nE5.2 traceRootCause");
  const trace = await traceRootCause(STUDENT_ID, COURSE_ID, "Integral Tentu");
  const order = trace.chain.map((c) => c.concept);
  check("chain has Aljabar before Antiturunan (deepest first)", order.indexOf("Aljabar Dasar") < order.indexOf("Antiturunan"));
  check("chain only weak prereqs (<40)", trace.chain.every((c) => c.mastery < 40));

  // Cycle safety: tracing X must terminate without infinite recursion.
  const cycleTrace = await traceRootCause(STUDENT_ID, COURSE_ID, "Konsep X");
  check("cycle terminates (no infinite loop)", Array.isArray(cycleTrace.chain));
  check("cycle does not revisit the start concept", !cycleTrace.chain.some((c) => c.concept === "Konsep X"));

  // ── E5.3 time estimate ───────────────────────────────────────────────────────
  console.log("\nE5.3 time estimate formula");
  check("estimate = chain*4 + 3", trace.estimatedMinutes === trace.chain.length * 4 + 3);

  console.log(`\nE5 result: ${pass} pass, ${fail} fail.`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => { console.error("seed-graph failed:", err); process.exit(1); });
