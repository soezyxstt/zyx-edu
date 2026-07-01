/**
 * Curriculum coverage queries against the learningOutcomes (CPL/CPMK/Sub-CPMK)
 * hierarchy added in db/schema.ts. Pure deterministic SQL, no AI involved,
 * per AGENT_CONTEXT.md's zero-AI-for-analytics rule.
 *
 * These directly answer the two example questions from the audit's vision:
 * "CPMK #5 has never been tested" and "this concept never appears in any
 * material" — see docs/audit/admin-knowledge-infrastructure-audit.md, item 4.
 */

import { db } from "@/db";
import {
  learningOutcomes,
  learningOutcomeConcepts,
  knowledgeObjects,
  assessmentObjectConcepts,
  assessmentObjects,
  assessmentSources,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export interface UntestedOutcome {
  outcomeId: string;
  code: string;
  level: "cpl" | "cpmk" | "sub_cpmk";
  description: string;
  mappedConceptCount: number;
}

export interface UntaughtOutcome {
  outcomeId: string;
  code: string;
  level: "cpl" | "cpmk" | "sub_cpmk";
  description: string;
  untaughtConceptIds: string[];
}

/** Outcomes whose mapped concepts have zero linked assessment objects anywhere in the course. */
export async function getUntestedOutcomes(courseId: string): Promise<UntestedOutcome[]> {
  const outcomes = await db
    .select({
      id: learningOutcomes.id,
      code: learningOutcomes.code,
      level: learningOutcomes.level,
      description: learningOutcomes.description,
    })
    .from(learningOutcomes)
    .where(eq(learningOutcomes.courseId, courseId));

  if (outcomes.length === 0) return [];

  const conceptLinks = await db
    .select({ learningOutcomeId: learningOutcomeConcepts.learningOutcomeId, conceptId: learningOutcomeConcepts.conceptId })
    .from(learningOutcomeConcepts)
    .where(inArray(learningOutcomeConcepts.learningOutcomeId, outcomes.map((o) => o.id)));

  const conceptIds = Array.from(new Set(conceptLinks.map((c) => c.conceptId)));
  if (conceptIds.length === 0) {
    // No outcome has any concept mapped at all -> every outcome is trivially untested.
    return outcomes.map((o) => ({ outcomeId: o.id, code: o.code, level: o.level, description: o.description, mappedConceptCount: 0 }));
  }

  const testedRows = await db
    .select({ conceptId: assessmentObjectConcepts.conceptId })
    .from(assessmentObjectConcepts)
    .innerJoin(assessmentObjects, eq(assessmentObjectConcepts.assessmentObjectId, assessmentObjects.id))
    .innerJoin(assessmentSources, eq(assessmentObjects.sourceId, assessmentSources.id))
    .where(and(eq(assessmentSources.courseId, courseId), inArray(assessmentObjectConcepts.conceptId, conceptIds)));

  const testedConceptIds = new Set(testedRows.map((r) => r.conceptId));

  const conceptsByOutcome = new Map<string, string[]>();
  for (const link of conceptLinks) {
    const arr = conceptsByOutcome.get(link.learningOutcomeId) ?? [];
    arr.push(link.conceptId);
    conceptsByOutcome.set(link.learningOutcomeId, arr);
  }

  return outcomes
    .filter((o) => {
      const mapped = conceptsByOutcome.get(o.id) ?? [];
      if (mapped.length === 0) return true; // unmapped outcome: nothing to test against, flag it
      return mapped.every((cId) => !testedConceptIds.has(cId));
    })
    .map((o) => ({
      outcomeId: o.id,
      code: o.code,
      level: o.level,
      description: o.description,
      mappedConceptCount: (conceptsByOutcome.get(o.id) ?? []).length,
    }));
}

/** Outcomes whose mapped concepts have zero active Knowledge Objects anywhere in the course. */
export async function getUntaughtOutcomes(courseId: string): Promise<UntaughtOutcome[]> {
  const outcomes = await db
    .select({
      id: learningOutcomes.id,
      code: learningOutcomes.code,
      level: learningOutcomes.level,
      description: learningOutcomes.description,
    })
    .from(learningOutcomes)
    .where(eq(learningOutcomes.courseId, courseId));

  if (outcomes.length === 0) return [];

  const conceptLinks = await db
    .select({ learningOutcomeId: learningOutcomeConcepts.learningOutcomeId, conceptId: learningOutcomeConcepts.conceptId })
    .from(learningOutcomeConcepts)
    .where(inArray(learningOutcomeConcepts.learningOutcomeId, outcomes.map((o) => o.id)));

  const conceptIds = Array.from(new Set(conceptLinks.map((c) => c.conceptId)));

  const taughtRows = conceptIds.length
    ? await db
        .select({ conceptId: knowledgeObjects.conceptId })
        .from(knowledgeObjects)
        .where(
          and(
            eq(knowledgeObjects.courseId, courseId),
            eq(knowledgeObjects.status, "active"),
            inArray(knowledgeObjects.conceptId, conceptIds)
          )
        )
    : [];
  const taughtConceptIds = new Set(taughtRows.map((r) => r.conceptId));

  const conceptsByOutcome = new Map<string, string[]>();
  for (const link of conceptLinks) {
    const arr = conceptsByOutcome.get(link.learningOutcomeId) ?? [];
    arr.push(link.conceptId);
    conceptsByOutcome.set(link.learningOutcomeId, arr);
  }

  const result: UntaughtOutcome[] = [];
  for (const o of outcomes) {
    const mapped = conceptsByOutcome.get(o.id) ?? [];
    const untaught = mapped.filter((cId) => !taughtConceptIds.has(cId));
    if (mapped.length === 0 || untaught.length > 0) {
      result.push({ outcomeId: o.id, code: o.code, level: o.level, description: o.description, untaughtConceptIds: untaught });
    }
  }
  return result;
}

/** Concepts that exist in the global registry but have zero active KOs within this course. */
export async function getConceptsMissingFromCourse(courseId: string): Promise<{ conceptId: string }[]> {
  const linkedConceptIds = await db
    .selectDistinct({ conceptId: learningOutcomeConcepts.conceptId })
    .from(learningOutcomeConcepts)
    .innerJoin(learningOutcomes, eq(learningOutcomeConcepts.learningOutcomeId, learningOutcomes.id))
    .where(eq(learningOutcomes.courseId, courseId));

  if (linkedConceptIds.length === 0) return [];

  const taughtRows = await db
    .select({ conceptId: knowledgeObjects.conceptId })
    .from(knowledgeObjects)
    .where(and(eq(knowledgeObjects.courseId, courseId), eq(knowledgeObjects.status, "active")));
  const taughtConceptIds = new Set(taughtRows.map((r) => r.conceptId));

  return linkedConceptIds.filter((c) => !taughtConceptIds.has(c.conceptId));
}
