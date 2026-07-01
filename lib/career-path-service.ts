/**
 * Career-Oriented Learning: orders a career's target concept set by
 * prerequisite dependency, the same Kahn's-algorithm approach already proven
 * in lib/study-path-service.ts, scoped to a curated cross-course concept set
 * instead of one course's full concept list.
 *
 * Deterministic graph traversal, no AI. Pure SQL + topological sort.
 */

import { db } from "@/db";
import {
  careerPathTemplates,
  careerPathConcepts,
  concepts,
  conceptLocalizations,
  knowledgeObjects,
  knowledgeRelationships,
  studentConceptMastery,
  courses,
} from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export interface CareerPathConceptStep {
  conceptId: string;
  conceptName: string;
  courseId: string | null;
  courseTitle: string | null;
  chapterId: string | null;
  masteryScore: number | null; // null if the student has no evidence for this concept yet
}

export interface CareerPathTemplateSummary {
  id: string;
  title: string;
  description: string | null;
}

export async function listCareerPathTemplates(): Promise<CareerPathTemplateSummary[]> {
  return db
    .select({ id: careerPathTemplates.id, title: careerPathTemplates.title, description: careerPathTemplates.description })
    .from(careerPathTemplates)
    .orderBy(careerPathTemplates.title);
}

/**
 * Returns the career's target concepts in prerequisite order. studentId is
 * optional: pass it to attach the student's own mastery score per concept
 * (null where the student has no evidence yet); omit it for an anonymous
 * "what would I need to learn" preview.
 */
export async function computeCareerPath(
  careerPathTemplateId: string,
  studentId?: string,
): Promise<CareerPathConceptStep[]> {
  const targetConcepts = await db
    .select({
      conceptId: careerPathConcepts.conceptId,
      displayName: conceptLocalizations.displayName,
    })
    .from(careerPathConcepts)
    .innerJoin(concepts, eq(careerPathConcepts.conceptId, concepts.id))
    .innerJoin(conceptLocalizations, eq(conceptLocalizations.conceptId, concepts.id))
    .where(eq(careerPathConcepts.careerPathTemplateId, careerPathTemplateId));

  if (targetConcepts.length === 0) return [];

  // One display name per concept (first localization wins; concepts are
  // single-language today per AGENT_CONTEXT.md's Bahasa Indonesia policy).
  const conceptNameById = new Map<string, string>();
  for (const c of targetConcepts) {
    if (!conceptNameById.has(c.conceptId)) conceptNameById.set(c.conceptId, c.displayName);
  }
  const conceptIds = [...conceptNameById.keys()];

  // Where can a student actually learn each concept? (first active KO found, any course)
  const koRows = await db
    .select({ id: knowledgeObjects.id, conceptId: knowledgeObjects.conceptId, courseId: knowledgeObjects.courseId, chapterId: knowledgeObjects.chapterId })
    .from(knowledgeObjects)
    .where(and(inArray(knowledgeObjects.conceptId, conceptIds), eq(knowledgeObjects.status, "active")));

  const courseChapterByConcept = new Map<string, { courseId: string; chapterId: string }>();
  const koToConceptId = new Map<string, string>();
  for (const k of koRows) {
    koToConceptId.set(k.id, k.conceptId);
    if (!courseChapterByConcept.has(k.conceptId)) {
      courseChapterByConcept.set(k.conceptId, { courseId: k.courseId, chapterId: k.chapterId });
    }
  }

  const courseIds = [...new Set([...courseChapterByConcept.values()].map((c) => c.courseId))];
  const courseTitleById = new Map<string, string>();
  if (courseIds.length > 0) {
    const courseRows = await db.select({ id: courses.id, title: courses.title }).from(courses).where(inArray(courses.id, courseIds));
    for (const c of courseRows) courseTitleById.set(c.id, c.title);
  }

  // Prerequisite edges among KOs backing these concepts, collapsed to concept-level, cross-course.
  const koIds = [...koToConceptId.keys()];
  const relEdges = koIds.length
    ? await db
        .select({ sourceKoId: knowledgeRelationships.sourceKoId, targetKoId: knowledgeRelationships.targetKoId })
        .from(knowledgeRelationships)
        .where(and(eq(knowledgeRelationships.type, "prerequisite"), inArray(knowledgeRelationships.sourceKoId, koIds), inArray(knowledgeRelationships.targetKoId, koIds)))
    : [];

  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>(conceptIds.map((id) => [id, 0]));
  for (const e of relEdges) {
    const s = koToConceptId.get(e.sourceKoId);
    const t = koToConceptId.get(e.targetKoId);
    if (!s || !t || s === t) continue;
    adjacency.set(s, [...(adjacency.get(s) ?? []), t]);
    inDegree.set(t, (inDegree.get(t) ?? 0) + 1);
  }

  // Kahn's algorithm, deterministic tie-break by concept id.
  const order: string[] = [];
  const visited = new Set<string>();
  let queue = conceptIds.filter((id) => (inDegree.get(id) ?? 0) === 0).sort();
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    order.push(id);
    for (const next of adjacency.get(id) ?? []) {
      inDegree.set(next, (inDegree.get(next) ?? 0) - 1);
      if ((inDegree.get(next) ?? 0) <= 0 && !visited.has(next)) {
        queue.push(next);
        queue.sort();
      }
    }
  }
  // Anything left over is part of a cycle; append in original order rather than dropping it.
  for (const id of conceptIds) {
    if (!visited.has(id)) order.push(id);
  }

  // Student mastery, if requested.
  const masteryByName = new Map<string, number>();
  if (studentId) {
    const conceptNames = order.map((id) => conceptNameById.get(id)!);
    const masteryRows = await db
      .select({ conceptName: studentConceptMastery.conceptName, masteryScore: studentConceptMastery.masteryScore })
      .from(studentConceptMastery)
      .where(and(eq(studentConceptMastery.studentId, studentId), inArray(studentConceptMastery.conceptName, conceptNames)));
    for (const r of masteryRows) masteryByName.set(r.conceptName.trim(), r.masteryScore);
  }

  return order.map((id) => {
    const conceptName = conceptNameById.get(id)!;
    const cc = courseChapterByConcept.get(id);
    return {
      conceptId: id,
      conceptName,
      courseId: cc?.courseId ?? null,
      courseTitle: cc ? courseTitleById.get(cc.courseId) ?? null : null,
      chapterId: cc?.chapterId ?? null,
      masteryScore: masteryByName.has(conceptName) ? masteryByName.get(conceptName)! : null,
    };
  });
}
