/**
 * Concept Explorer: assembles a single-concept "everything about this topic"
 * view from data that already existed across concepts/conceptLocalizations,
 * knowledgeObjects (grouped by type: definition/formula/example/misconception/
 * etc.), and knowledgeRelationships (prerequisite/related/extends edges).
 *
 * Closes docs/audit/active-recall-and-exploration-audit.md item 2: every
 * piece of data the vision needed already existed, nobody assembled it into
 * one page. Pure SQL, no AI.
 */

import { db } from "@/db";
import { concepts, conceptLocalizations, knowledgeObjects, knowledgeRelationships, studentConceptMastery } from "@/db/schema";
import { and, eq, inArray, or } from "drizzle-orm";

export interface ConceptRef {
  conceptName: string;
  slug: string;
}

export interface ConceptKO {
  id: string;
  title: string;
  content: string;
}

export interface ConceptExplorerData {
  conceptId: string;
  conceptName: string;
  canonicalSlug: string;
  masteryScore: number | null;
  kosByType: Partial<Record<
    "definition" | "formula" | "example" | "misconception" | "exercise" | "summary" | "objective" | "concept_overview",
    ConceptKO[]
  >>;
  prerequisites: ConceptRef[]; // concepts this one depends on
  unlocks: ConceptRef[];       // concepts that depend on this one
  related: ConceptRef[];
}

function dedupeBySlug(refs: ConceptRef[]): ConceptRef[] {
  const seen = new Map<string, ConceptRef>();
  for (const r of refs) if (!seen.has(r.slug)) seen.set(r.slug, r);
  return [...seen.values()];
}

/**
 * Returns null if the concept doesn't exist, or isn't actually taught
 * (no active KOs) in the given course.
 */
export async function getConceptExplorerData(
  courseId: string,
  slug: string,
  studentId?: string,
): Promise<ConceptExplorerData | null> {
  const [conceptRow] = await db
    .select({ id: concepts.id, canonicalSlug: concepts.canonicalSlug, displayName: conceptLocalizations.displayName })
    .from(concepts)
    .innerJoin(conceptLocalizations, eq(conceptLocalizations.conceptId, concepts.id))
    .where(eq(concepts.canonicalSlug, slug))
    .limit(1);

  if (!conceptRow) return null;

  const kos = await db
    .select({ id: knowledgeObjects.id, title: knowledgeObjects.title, content: knowledgeObjects.content, type: knowledgeObjects.type })
    .from(knowledgeObjects)
    .where(
      and(
        eq(knowledgeObjects.courseId, courseId),
        eq(knowledgeObjects.conceptId, conceptRow.id),
        eq(knowledgeObjects.status, "active"),
      ),
    );

  if (kos.length === 0) return null;

  const kosByType: ConceptExplorerData["kosByType"] = {};
  for (const ko of kos) {
    const list = kosByType[ko.type] ?? [];
    list.push({ id: ko.id, title: ko.title, content: ko.content });
    kosByType[ko.type] = list;
  }

  const koIds = kos.map((k) => k.id);
  const edges = koIds.length
    ? await db
        .select({ sourceKoId: knowledgeRelationships.sourceKoId, targetKoId: knowledgeRelationships.targetKoId, type: knowledgeRelationships.type })
        .from(knowledgeRelationships)
        .where(or(inArray(knowledgeRelationships.sourceKoId, koIds), inArray(knowledgeRelationships.targetKoId, koIds)))
    : [];

  const otherKoIds = new Set<string>();
  for (const e of edges) {
    otherKoIds.add(e.sourceKoId);
    otherKoIds.add(e.targetKoId);
  }

  const otherKoRows = otherKoIds.size
    ? await db
        .select({ id: knowledgeObjects.id, conceptId: knowledgeObjects.conceptId })
        .from(knowledgeObjects)
        .where(inArray(knowledgeObjects.id, [...otherKoIds]))
    : [];
  const koToConceptId = new Map(otherKoRows.map((r) => [r.id, r.conceptId]));

  const otherConceptIds = new Set([...koToConceptId.values()].filter((id) => id !== conceptRow.id));
  const otherConceptRows = otherConceptIds.size
    ? await db
        .select({ id: concepts.id, slug: concepts.canonicalSlug, displayName: conceptLocalizations.displayName })
        .from(concepts)
        .innerJoin(conceptLocalizations, eq(conceptLocalizations.conceptId, concepts.id))
        .where(inArray(concepts.id, [...otherConceptIds]))
    : [];
  const conceptInfo = new Map(otherConceptRows.map((r) => [r.id, { slug: r.slug, name: r.displayName }]));

  const prerequisites: ConceptRef[] = [];
  const unlocks: ConceptRef[] = [];
  const related: ConceptRef[] = [];

  for (const e of edges) {
    const srcConceptId = koToConceptId.get(e.sourceKoId);
    const tgtConceptId = koToConceptId.get(e.targetKoId);
    if (!srcConceptId || !tgtConceptId || srcConceptId === tgtConceptId) continue;

    if (e.type === "prerequisite") {
      if (tgtConceptId === conceptRow.id) {
        const info = conceptInfo.get(srcConceptId);
        if (info) prerequisites.push({ conceptName: info.name, slug: info.slug });
      } else if (srcConceptId === conceptRow.id) {
        const info = conceptInfo.get(tgtConceptId);
        if (info) unlocks.push({ conceptName: info.name, slug: info.slug });
      }
    } else if (e.type === "related" || e.type === "extends") {
      const otherId = srcConceptId === conceptRow.id ? tgtConceptId : srcConceptId;
      const info = conceptInfo.get(otherId);
      if (info) related.push({ conceptName: info.name, slug: info.slug });
    }
  }

  let masteryScore: number | null = null;
  if (studentId) {
    const [m] = await db
      .select({ masteryScore: studentConceptMastery.masteryScore })
      .from(studentConceptMastery)
      .where(
        and(
          eq(studentConceptMastery.studentId, studentId),
          eq(studentConceptMastery.courseId, courseId),
          eq(studentConceptMastery.conceptName, conceptRow.displayName),
        ),
      )
      .limit(1);
    masteryScore = m?.masteryScore ?? null;
  }

  return {
    conceptId: conceptRow.id,
    conceptName: conceptRow.displayName,
    canonicalSlug: conceptRow.canonicalSlug,
    masteryScore,
    kosByType,
    prerequisites: dedupeBySlug(prerequisites),
    unlocks: dedupeBySlug(unlocks),
    related: dedupeBySlug(related),
  };
}
