/**
 * E3: seed + verify the material term index and the KO-backed popover data.
 * Run: npx tsx scripts/seed-term-index.ts
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
  studentConceptMastery,
  user as userTable,
} from "../db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { buildTermIndex } from "../lib/term-index";
import { getLearningContext, invalidateLearningContext } from "../lib/learning-context";

const COURSE_ID = "term-test-course";
const STUDENT_ID = "term-test-student";
const MTD_ID = "term-test-mtd";
const CHAPTER_ID = "term-test-chapter";
const CONCEPT_ID = "term-concept-real";
const CONCEPT_NAME = "Bilangan Real";

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean) {
  if (cond) { pass += 1; console.log(`  PASS ${label}`); }
  else { fail += 1; console.log(`  FAIL ${label}`); }
}

async function main() {
  console.log("E3 term-index seed starting...");
  await db.delete(knowledgeObjects).where(eq(knowledgeObjects.courseId, COURSE_ID));
  await db.delete(studentConceptMastery).where(eq(studentConceptMastery.courseId, COURSE_ID));

  await db.insert(userTable).values({ id: STUDENT_ID, name: "Term Student", email: "term@zyx.local", emailVerified: true, role: "student" }).onConflictDoNothing();
  await db.insert(courses).values({ id: COURSE_ID, title: "Term Test", category: "Test" as never, description: "E3" }).onConflictDoNothing();
  await db.insert(masterTeachingDocuments).values({ id: MTD_ID, courseId: COURSE_ID, title: "MTD", markdownContent: "# t", status: "active", createdById: STUDENT_ID }).onConflictDoNothing();
  await db.insert(chapters).values({ id: CHAPTER_ID, courseId: COURSE_ID, title: "Ch", orderIndex: 1, status: "published" }).onConflictDoNothing();
  await db.insert(concepts).values({ id: CONCEPT_ID, canonicalSlug: "term-test-bilangan-real", isVerified: true }).onConflictDoNothing();
  await db.insert(conceptLocalizations).values({
    id: `${CONCEPT_ID}-loc`, conceptId: CONCEPT_ID, lang: "id",
    displayName: CONCEPT_NAME, aliases: ["Real Number", "Bilangan riil"],
  }).onConflictDoNothing();

  // KO set per type, definition carries an analogy.
  const koSpecs: Array<{ type: "definition" | "example" | "misconception"; analogy?: string }> = [
    { type: "definition", analogy: "seperti garis bilangan tak terputus" },
    { type: "example" },
    { type: "misconception" },
  ];
  for (let i = 0; i < koSpecs.length; i++) {
    const s = koSpecs[i];
    await db.insert(knowledgeObjects).values({
      id: `term-ko-${i}`, courseId: COURSE_ID, mtdId: MTD_ID, chapterId: CHAPTER_ID, conceptId: CONCEPT_ID,
      learningOrder: i + 1, title: `${CONCEPT_NAME} ${s.type}`, conceptName: CONCEPT_NAME,
      content: `Konten ${s.type} untuk bilangan real.`, type: s.type, difficulty: "medium",
      bloomLevel: "understand", importance: "high",
      metadata: s.analogy ? { analogy: s.analogy } : {}, status: "active",
    });
  }
  await db.insert(studentConceptMastery).values({
    id: randomUUID(), studentId: STUDENT_ID, courseId: COURSE_ID, conceptName: CONCEPT_NAME,
    masteryScore: 64, confidence: 70, evidenceCount: 3, trend: "improving", lastEvidenceAt: new Date(), updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: [studentConceptMastery.studentId, studentConceptMastery.courseId, studentConceptMastery.conceptName],
    set: { masteryScore: 64 },
  });

  // ── E3.1 term index ──────────────────────────────────────────────────────────
  console.log("\nE3.1 term index build");
  const index = await buildTermIndex(CHAPTER_ID);
  const terms = index.map((e) => e.term);
  check("includes normalized display name", terms.includes("bilangan real"));
  check("includes alias 'real number' lowercased", terms.includes("real number"));
  check("includes alias 'bilangan riil'", terms.includes("bilangan riil"));
  check("all entries map to the concept", index.every((e) => e.conceptName === CONCEPT_NAME));
  check("deduped (no repeated terms)", new Set(terms).size === terms.length);
  check("sorted longest term first", terms.every((t, i) => i === 0 || terms[i - 1].length >= t.length));

  // ── E3.3 popover data from KO (deterministic, zero AI) ────────────────────────
  console.log("\nE3.3 KO-backed popover data");
  invalidateLearningContext(COURSE_ID);
  const ctx = await getLearningContext(STUDENT_ID, COURSE_ID, { conceptName: CONCEPT_NAME });
  check("quick explain available (definition KO)", ctx.kos.definition.length >= 1);
  check("analogy surfaced from metadata", ctx.kos.definition.some((k) => k.analogy === "seperti garis bilangan tak terputus"));
  check("example available", ctx.kos.example.length >= 1);
  check("common mistake available (misconception KO)", ctx.kos.misconception.length >= 1);
  check("mastery chip score is 64", ctx.mastery.score === 64);

  console.log(`\nE3 result: ${pass} pass, ${fail} fail.`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => { console.error("seed-term-index failed:", err); process.exit(1); });
