/**
 * EIF E5: concept graph rollup builder + cycle-safe root-cause tracer.
 *
 * Collapses KO-level `knowledge_relationships` to concept-level
 * `concept_graph_edges` (rebuilt on publish), and traces a weak concept to its
 * deepest weak prerequisites. Pure DB + logic, no AI.
 */
import { db } from "@/db";
import { knowledgeObjects, knowledgeRelationships, conceptGraphEdges, studentConceptMastery, courses } from "@/db/schema";
import { and, eq, inArray, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";

const WEAK_PREREQ_THRESHOLD = 40;

/**
 * Rebuilds the concept-level edge rollup for a course from KO-level edges.
 * Deduped via the unique index; full replace per course.
 */
export async function buildConceptGraph(courseId: string): Promise<number> {
  const kos = await db
    .select({ id: knowledgeObjects.id, conceptName: knowledgeObjects.conceptName })
    .from(knowledgeObjects)
    .where(and(eq(knowledgeObjects.courseId, courseId), eq(knowledgeObjects.status, "active")));

  const koIdToConcept = new Map(kos.map((k) => [k.id, k.conceptName.trim()]));
  const koIds = [...koIdToConcept.keys()];

  const edges = koIds.length
    ? await db
        .select({ sourceKoId: knowledgeRelationships.sourceKoId, targetKoId: knowledgeRelationships.targetKoId, type: knowledgeRelationships.type })
        .from(knowledgeRelationships)
        .where(or(inArray(knowledgeRelationships.sourceKoId, koIds), inArray(knowledgeRelationships.targetKoId, koIds)))
    : [];

  const seen = new Set<string>();
  const rows: Array<{ id: string; courseId: string; sourceConcept: string; targetConcept: string; type: "prerequisite" | "related" }> = [];
  for (const e of edges) {
    if (e.type !== "prerequisite" && e.type !== "related") continue;
    const s = koIdToConcept.get(e.sourceKoId);
    const t = koIdToConcept.get(e.targetKoId);
    if (!s || !t || s === t) continue;
    const key = `${s}|${t}|${e.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ id: randomUUID(), courseId, sourceConcept: s, targetConcept: t, type: e.type });
  }

  await db.transaction(async (tx) => {
    await tx.delete(conceptGraphEdges).where(eq(conceptGraphEdges.courseId, courseId));
    if (rows.length > 0) await tx.insert(conceptGraphEdges).values(rows);
  });

  return rows.length;
}

export interface RootCauseResult {
  chain: Array<{ concept: string; mastery: number }>;
  estimatedMinutes: number;
}

/**
 * Traces a concept to its weak prerequisite chain (mastery under 40), deepest
 * first. Cycle-safe via a visited set. Same time formula as E2 remediation.
 */
export async function traceRootCause(
  studentId: string,
  courseId: string,
  conceptName: string,
): Promise<RootCauseResult> {
  const edges = await db
    .select({ sourceConcept: conceptGraphEdges.sourceConcept, targetConcept: conceptGraphEdges.targetConcept })
    .from(conceptGraphEdges)
    .where(and(eq(conceptGraphEdges.courseId, courseId), eq(conceptGraphEdges.type, "prerequisite")));

  // target -> prerequisite sources
  const prereqs = new Map<string, string[]>();
  for (const e of edges) {
    const list = prereqs.get(e.targetConcept) ?? [];
    list.push(e.sourceConcept);
    prereqs.set(e.targetConcept, list);
  }

  const masteryRows = await db
    .select({ conceptName: studentConceptMastery.conceptName, masteryScore: studentConceptMastery.masteryScore })
    .from(studentConceptMastery)
    .where(and(eq(studentConceptMastery.studentId, studentId), eq(studentConceptMastery.courseId, courseId)));
  const masteryOf = new Map(masteryRows.map((r) => [r.conceptName.trim(), r.masteryScore]));

  const chain: Array<{ concept: string; mastery: number }> = [];
  const visited = new Set<string>([conceptName.trim()]);

  // DFS over weak prerequisites, deepest first, cycle-safe.
  const walk = (concept: string) => {
    const sources = prereqs.get(concept) ?? [];
    // Sort so the weakest prerequisite is explored first.
    const weakSources = sources
      .filter((s) => (masteryOf.get(s) ?? 0) < WEAK_PREREQ_THRESHOLD)
      .sort((a, b) => (masteryOf.get(a) ?? 0) - (masteryOf.get(b) ?? 0));
    for (const s of weakSources) {
      if (visited.has(s)) continue;
      visited.add(s);
      walk(s); // deeper prerequisites first
      chain.push({ concept: s, mastery: masteryOf.get(s) ?? 0 });
    }
  };
  walk(conceptName.trim());

  const estimatedMinutes = chain.length * 4 + (chain.length > 0 ? 3 : 0);
  return { chain, estimatedMinutes };
}

// ─── Cross-Course Knowledge Graph ───────────────────────────────────────────
// Closes docs/audit/admin-knowledge-infrastructure-audit.md item 1: the
// concept registry (concepts/conceptLocalizations) is already global, but
// conceptGraphEdges is rebuilt and queried per-course only, so the same
// concept used in 4 courses shows up as 4 disconnected node clusters. This
// adds a cross-course query mode without touching the per-course rebuild
// above (buildConceptGraph) or the existing per-course mastery-page view.

export interface CrossCourseConceptCourse {
  courseId: string;
  courseTitle: string;
}

export interface CrossCourseConceptEdge {
  courseId: string;
  sourceConcept: string;
  targetConcept: string;
  type: "prerequisite" | "related";
}

/**
 * Given a concept name, returns every course that actually teaches it
 * (has an active KO with that conceptName) and every concept-graph edge
 * touching it across all of those courses, so a future "this concept
 * everywhere" view doesn't need to merge per-course graphs by hand.
 */
export async function getCrossCourseConceptGraph(conceptName: string): Promise<{
  courses: CrossCourseConceptCourse[];
  edges: CrossCourseConceptEdge[];
}> {
  const trimmed = conceptName.trim();

  const courseRows = await db
    .selectDistinct({ courseId: knowledgeObjects.courseId, courseTitle: courses.title })
    .from(knowledgeObjects)
    .innerJoin(courses, eq(knowledgeObjects.courseId, courses.id))
    .where(and(eq(knowledgeObjects.conceptName, trimmed), eq(knowledgeObjects.status, "active")));

  if (courseRows.length === 0) {
    return { courses: [], edges: [] };
  }

  const courseIds = courseRows.map((c) => c.courseId);

  const edgeRows = await db
    .select({
      courseId: conceptGraphEdges.courseId,
      sourceConcept: conceptGraphEdges.sourceConcept,
      targetConcept: conceptGraphEdges.targetConcept,
      type: conceptGraphEdges.type,
    })
    .from(conceptGraphEdges)
    .where(
      and(
        inArray(conceptGraphEdges.courseId, courseIds),
        or(eq(conceptGraphEdges.sourceConcept, trimmed), eq(conceptGraphEdges.targetConcept, trimmed)),
      ),
    );

  return { courses: courseRows, edges: edgeRows };
}
