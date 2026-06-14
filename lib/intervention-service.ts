import { db } from "@/db";
import {
  studentConceptMastery,
  knowledgeObjects,
  learningEvents,
  interventions,
  quizTemplates,
  flashcards,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getReviewHref } from "@/lib/mistake-feedback";
import { randomUUID } from "node:crypto";

export async function evaluateInterventions(studentId: string, courseId: string): Promise<void> {
  // 1. Fetch all active concepts for this course
  const kos = await db
    .select({ conceptName: knowledgeObjects.conceptName })
    .from(knowledgeObjects)
    .where(and(eq(knowledgeObjects.courseId, courseId), eq(knowledgeObjects.status, "active")));
  
  const conceptNames = Array.from(new Set(kos.map((k) => k.conceptName.trim()).filter(Boolean)));
  if (conceptNames.length === 0) return;

  // 2. Fetch all student concept masteries for this course
  const masteries = await db
    .select()
    .from(studentConceptMastery)
    .where(
      and(
        eq(studentConceptMastery.studentId, studentId),
        eq(studentConceptMastery.courseId, courseId)
      )
    );
  
  const masteryMap = new Map(masteries.map((m) => [m.conceptName.trim(), m]));

  // 3. Fetch all active interventions for this student and course
  const activeInterventions = await db
    .select()
    .from(interventions)
    .where(
      and(
        eq(interventions.studentId, studentId),
        eq(interventions.courseId, courseId),
        eq(interventions.status, "active")
      )
    );
  
  const activeMap = new Map(activeInterventions.map((i) => [i.conceptName.trim(), i]));

  // Step 1: Resolution Evaluation
  for (const active of activeInterventions) {
    const mastery = masteryMap.get(active.conceptName.trim());
    if (mastery && mastery.masteryScore > 60) {
      await db
        .update(interventions)
        .set({
          status: "resolved",
          resolvedAt: new Date(),
        })
        .where(eq(interventions.id, active.id));
      
      // Remove from activeMap so we don't skip re-trigger evaluation if needed
      activeMap.delete(active.conceptName.trim());
    }
  }

  // Step 2: Rule Evaluation for each concept
  for (const conceptName of conceptNames) {
    // Skip if there is an active intervention for this concept
    if (activeMap.has(conceptName)) {
      continue;
    }

    let triggerReason: string | null = null;

    // Rule 1: 3 consecutive quiz failures
    const recentQuizEvents = await db
      .select({ correctness: learningEvents.correctness })
      .from(learningEvents)
      .where(
        and(
          eq(learningEvents.studentId, studentId),
          eq(learningEvents.courseId, courseId),
          eq(learningEvents.conceptName, conceptName),
          eq(learningEvents.eventType, "quiz_answer")
        )
      )
      .orderBy(desc(learningEvents.createdAt))
      .limit(3);
    
    if (
      recentQuizEvents.length >= 3 &&
      recentQuizEvents.every((e) => e.correctness === 0)
    ) {
      triggerReason = "3 consecutive quiz failures";
    }

    // Rule 2: Low and declining mastery (mastery < 30 AND trend === 'declining')
    if (!triggerReason) {
      const mastery = masteryMap.get(conceptName);
      if (mastery && mastery.masteryScore < 30 && mastery.trend === "declining") {
        triggerReason = "low and declining mastery";
      }
    }

    if (triggerReason) {
      // Build remediation payload
      const moduleHref = await getReviewHref(courseId, conceptName);

      // Find relevant quiz templates covering this concept
      const templates = await db
        .select({ id: quizTemplates.id, selectionRules: quizTemplates.selectionRules })
        .from(quizTemplates)
        .where(
          and(
            eq(quizTemplates.courseId, courseId),
            eq(quizTemplates.visibility, "free")
          )
        );

      const quizTemplateIds = templates
        .filter((t) => {
          const rules = t.selectionRules as Record<string, unknown> | null;
          const tags = rules?.tags as string[] | undefined;
          return tags && tags.includes(conceptName);
        })
        .map((t) => t.id);

      // Count active flashcards covering this concept
      const [fcCountRow] = await db
        .select({ count: sql<number>`count(${flashcards.id})` })
        .from(flashcards)
        .innerJoin(knowledgeObjects, eq(flashcards.koId, knowledgeObjects.id))
        .where(
          and(
            eq(knowledgeObjects.conceptName, conceptName),
            eq(flashcards.status, "active")
          )
        );
      
      const flashcardCount = fcCountRow?.count ?? 0;

      const payload = {
        moduleHref,
        quizTemplateIds,
        flashcardCount,
      };

      // Create intervention
      await db.insert(interventions).values({
        id: randomUUID(),
        studentId,
        courseId,
        conceptName,
        reason: triggerReason,
        status: "active",
        payload,
        createdAt: new Date(),
      }).onConflictDoNothing();
    }
  }
}
