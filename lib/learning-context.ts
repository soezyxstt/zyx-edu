import { db } from "@/db";
import { knowledgeObjects, knowledgeRelationships, studentConceptMastery } from "@/db/schema";
import { and, eq, inArray, or } from "drizzle-orm";
import { buildPrereqConceptMap } from "@/lib/mastery-store";
import { getReviewHref } from "@/lib/mistake-feedback";

/**
 * E0: Learning Context Fabric.
 *
 * Single deterministic assembler. Given a student and a concept (or KO), returns
 * the unified learning state every surface needs: mastery, concept-graph position,
 * and the concept's knowledge objects bucketed by type. No AI calls.
 *
 * Every embedded surface (quiz remediation, interactive material, learning graph,
 * tutor enrichment) reads this so they all answer from one student model.
 */

export type KOType =
  | "definition"
  | "formula"
  | "example"
  | "misconception"
  | "exercise"
  | "summary"
  | "objective"
  | "concept_overview";

export interface LearningContextKO {
  id: string;
  type: KOType;
  title: string;
  content: string; // markdown + latex
  importance: "high" | "medium" | "low";
  analogy?: string; // from ko.metadata.analogy if present
  pitfall?: string; // from ko.metadata.pitfall if present
}

export interface LearningContext {
  conceptName: string;
  conceptId: string | null;
  mastery: {
    score: number; // 0..100, default 0
    confidence: number; // 0..100, default 0
    trend: "improving" | "stable" | "declining" | null;
    evidenceCount: number;
  };
  blockedBy: string[]; // prerequisite concepts under BLOCK_THRESHOLD mastery
  prerequisites: string[]; // all prerequisite concepts
  related: string[]; // related concepts
  kos: {
    definition: LearningContextKO[];
    formula: LearningContextKO[];
    example: LearningContextKO[];
    misconception: LearningContextKO[];
    other: LearningContextKO[];
  };
  reviewHref: string;
}

const BLOCK_THRESHOLD = 40;
const IMPORTANCE_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const CONCEPT_CACHE_TTL_MS = 60_000;

interface KoRow {
  id: string;
  conceptId: string;
  conceptName: string;
  type: KOType;
  title: string;
  content: string;
  importance: "high" | "medium" | "low";
  learningOrder: number;
  metadata: unknown;
}

interface EdgeRow {
  sourceKoId: string;
  targetKoId: string;
  type: string;
}

interface CourseGraphEntry {
  expires: number;
  kos: KoRow[];
  edges: EdgeRow[];
  koIdToConcept: Map<string, string>;
}

// Per-course memo of KOs + edges (changes only on publish). Mastery is never cached.
const courseGraphCache = new Map<string, CourseGraphEntry>();

// Test hook: counts DB cache misses (one KO + one edge fetch per miss). Used by
// scripts/seed-embed.ts to assert the per-table query budget (E0.4).
let courseGraphDbHits = 0;
export function getCourseGraphDbHits(): number {
  return courseGraphDbHits;
}

async function loadCourseGraph(courseId: string): Promise<CourseGraphEntry> {
  const cached = courseGraphCache.get(courseId);
  if (cached && cached.expires > Date.now()) return cached;
  courseGraphDbHits += 1;

  const kos = (await db
    .select({
      id: knowledgeObjects.id,
      conceptId: knowledgeObjects.conceptId,
      conceptName: knowledgeObjects.conceptName,
      type: knowledgeObjects.type,
      title: knowledgeObjects.title,
      content: knowledgeObjects.content,
      importance: knowledgeObjects.importance,
      learningOrder: knowledgeObjects.learningOrder,
      metadata: knowledgeObjects.metadata,
    })
    .from(knowledgeObjects)
    .where(and(eq(knowledgeObjects.courseId, courseId), eq(knowledgeObjects.status, "active")))) as KoRow[];

  const koIds = kos.map((k) => k.id);
  const edges: EdgeRow[] = koIds.length
    ? await db
        .select({
          sourceKoId: knowledgeRelationships.sourceKoId,
          targetKoId: knowledgeRelationships.targetKoId,
          type: knowledgeRelationships.type,
        })
        .from(knowledgeRelationships)
        .where(
          or(
            inArray(knowledgeRelationships.sourceKoId, koIds),
            inArray(knowledgeRelationships.targetKoId, koIds),
          ),
        )
    : [];

  const koIdToConcept = new Map<string, string>();
  for (const ko of kos) {
    koIdToConcept.set(ko.id, ko.conceptName.trim());
  }

  const entry: CourseGraphEntry = {
    expires: Date.now() + CONCEPT_CACHE_TTL_MS,
    kos,
    edges,
    koIdToConcept,
  };
  courseGraphCache.set(courseId, entry);
  return entry;
}

function toContextKO(ko: KoRow): LearningContextKO {
  const meta = (ko.metadata ?? {}) as Record<string, unknown>;
  const analogy = typeof meta.analogy === "string" ? meta.analogy : undefined;
  const pitfall = typeof meta.pitfall === "string" ? meta.pitfall : undefined;
  return {
    id: ko.id,
    type: ko.type,
    title: ko.title,
    content: ko.content,
    importance: ko.importance,
    ...(analogy ? { analogy } : {}),
    ...(pitfall ? { pitfall } : {}),
  };
}

/** Clears the per-course memo. Call after a material or KO publish in the same process. */
export function invalidateLearningContext(courseId?: string): void {
  if (courseId) courseGraphCache.delete(courseId);
  else courseGraphCache.clear();
}

export async function getLearningContext(
  studentId: string,
  courseId: string,
  key: { conceptName: string } | { koId: string },
): Promise<LearningContext> {
  const graph = await loadCourseGraph(courseId);

  // 1. Resolve concept name + id
  let conceptName = "";
  let conceptId: string | null = null;
  if ("koId" in key) {
    const ko = graph.kos.find((k) => k.id === key.koId);
    if (ko) {
      conceptName = ko.conceptName.trim();
      conceptId = ko.conceptId;
    }
  } else {
    conceptName = key.conceptName.trim();
    conceptId = graph.kos.find((k) => k.conceptName.trim() === conceptName)?.conceptId ?? null;
  }

  // 2. Mastery (single query, all concepts for student+course)
  const masteryRows = await db
    .select()
    .from(studentConceptMastery)
    .where(
      and(
        eq(studentConceptMastery.studentId, studentId),
        eq(studentConceptMastery.courseId, courseId),
      ),
    );
  const masteryByConcept = new Map(masteryRows.map((r) => [r.conceptName.trim(), r]));
  const m = conceptName ? masteryByConcept.get(conceptName) : undefined;
  const mastery = {
    score: m?.masteryScore ?? 0,
    confidence: m?.confidence ?? 0,
    trend: m?.trend ?? null,
    evidenceCount: m?.evidenceCount ?? 0,
  };

  // 3. Concept-graph position (reuses the shared prereq collapse)
  const prereqEdges = graph.edges.filter((e) => e.type === "prerequisite");
  const relatedEdges = graph.edges.filter((e) => e.type === "related");
  const prereqMap = buildPrereqConceptMap(graph.koIdToConcept, prereqEdges);
  const prerequisites = conceptName ? [...(prereqMap.get(conceptName) ?? [])] : [];

  const relatedSet = new Set<string>();
  for (const e of relatedEdges) {
    const s = graph.koIdToConcept.get(e.sourceKoId);
    const t = graph.koIdToConcept.get(e.targetKoId);
    if (!s || !t || s === t) continue;
    if (s === conceptName) relatedSet.add(t);
    if (t === conceptName) relatedSet.add(s);
  }
  const related = [...relatedSet];

  const blockedBy = prerequisites.filter(
    (p) => (masteryByConcept.get(p)?.masteryScore ?? 0) < BLOCK_THRESHOLD,
  );

  // 4. KOs of this concept, bucketed by type, sorted importance then learningOrder
  const conceptKOs = conceptName
    ? graph.kos
        .filter((k) => k.conceptName.trim() === conceptName)
        .sort(
          (a, b) =>
            (IMPORTANCE_RANK[a.importance] ?? 1) - (IMPORTANCE_RANK[b.importance] ?? 1) ||
            a.learningOrder - b.learningOrder,
        )
    : [];

  const kos: LearningContext["kos"] = {
    definition: [],
    formula: [],
    example: [],
    misconception: [],
    other: [],
  };
  for (const ko of conceptKOs) {
    const mapped = toContextKO(ko);
    if (ko.type === "definition") kos.definition.push(mapped);
    else if (ko.type === "formula") kos.formula.push(mapped);
    else if (ko.type === "example") kos.example.push(mapped);
    else if (ko.type === "misconception") kos.misconception.push(mapped);
    else kos.other.push(mapped);
  }

  // 5. Review deep link
  const reviewHref = await getReviewHref(courseId, conceptName || null);

  return {
    conceptName,
    conceptId,
    mastery,
    blockedBy,
    prerequisites,
    related,
    kos,
    reviewHref,
  };
}
