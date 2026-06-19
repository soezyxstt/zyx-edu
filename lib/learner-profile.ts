/**
 * Deterministic learner profile (P3 Tier 2 input). Zero AI.
 *
 * Built from P1A mastery data, learning events, and tutor session summaries.
 * Never serialized into shared caches; per-student data stays per-request.
 */

import { randomUUID } from "node:crypto";
import { db } from "@/db";
import {
  learningEvents,
  tutorSessionSummaries,
  studentFlashcardProgress,
  flashcards,
  knowledgeObjects,
} from "@/db/schema";
import { getMastery } from "@/lib/mastery-store";
import { and, eq, gte, lte, sql, desc } from "drizzle-orm";

const WEAK_THRESHOLD = 60;
const MASTERED_THRESHOLD = 80;
const STRUGGLE_WINDOW_DAYS = 14;

export interface WeakConcept {
  conceptName: string;
  masteryScore: number;
}

export interface LearnerProfile {
  weakConcepts: WeakConcept[];
  masteredConcepts: string[];
  recentStruggles: string[];
  recentTutorTopics: string[];
}

export async function buildLearnerProfile(
  studentId: string,
  courseId: string
): Promise<LearnerProfile> {
  const since = new Date();
  since.setDate(since.getDate() - STRUGGLE_WINDOW_DAYS);

  const [mastery, struggleRows, [summary]] = await Promise.all([
    getMastery(studentId, courseId),
    db
      .selectDistinct({ conceptName: learningEvents.conceptName })
      .from(learningEvents)
      .where(
        and(
          eq(learningEvents.studentId, studentId),
          eq(learningEvents.courseId, courseId),
          lte(learningEvents.correctness, 0.5),
          gte(learningEvents.createdAt, since)
        )
      )
      .limit(10),
    db
      .select()
      .from(tutorSessionSummaries)
      .where(
        and(
          eq(tutorSessionSummaries.studentId, studentId),
          eq(tutorSessionSummaries.courseId, courseId)
        )
      ),
  ]);

  return {
    weakConcepts: mastery
      .filter((m) => m.masteryScore < WEAK_THRESHOLD)
      .map((m) => ({ conceptName: m.conceptName, masteryScore: m.masteryScore })),
    masteredConcepts: mastery
      .filter((m) => m.masteryScore >= MASTERED_THRESHOLD)
      .map((m) => m.conceptName),
    recentStruggles: struggleRows
      .map((r) => r.conceptName)
      .filter((c): c is string => !!c),
    recentTutorTopics: Array.isArray(summary?.askedConcepts)
      ? (summary.askedConcepts as string[])
      : [],
  };
}

/**
 * Counts flashcards due now for a concept (flashcard -> KO -> conceptName).
 * Used by the Tier 2 addendum.
 */
export async function countDueFlashcardsForConcept(
  studentId: string,
  courseId: string,
  conceptName: string
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(studentFlashcardProgress)
    .innerJoin(flashcards, eq(studentFlashcardProgress.flashcardId, flashcards.id))
    .innerJoin(knowledgeObjects, eq(flashcards.koId, knowledgeObjects.id))
    .where(
      and(
        eq(studentFlashcardProgress.studentId, studentId),
        eq(knowledgeObjects.courseId, courseId),
        eq(knowledgeObjects.conceptName, conceptName),
        lte(studentFlashcardProgress.dueDate, new Date())
      )
    );
  return row?.count ?? 0;
}

/**
 * Finds the chapter a concept belongs to (first active KO match).
 * Used to build the Tier 2 review link.
 */
export async function findChapterForConcept(
  courseId: string,
  conceptName: string
): Promise<string | null> {
  const [ko] = await db
    .select({ chapterId: knowledgeObjects.chapterId })
    .from(knowledgeObjects)
    .where(
      and(
        eq(knowledgeObjects.courseId, courseId),
        eq(knowledgeObjects.conceptName, conceptName),
        eq(knowledgeObjects.status, "active")
      )
    )
    .orderBy(desc(knowledgeObjects.importance))
    .limit(1);
  return ko?.chapterId ?? null;
}

/**
 * Deterministic session memory update after each tutor exchange:
 * appends new matched concepts (dedup, cap 50) and bumps the counter.
 */
export async function updateTutorSessionSummary(
  studentId: string,
  courseId: string,
  matchedConcepts: string[]
): Promise<void> {
  const [existing] = await db
    .select()
    .from(tutorSessionSummaries)
    .where(
      and(
        eq(tutorSessionSummaries.studentId, studentId),
        eq(tutorSessionSummaries.courseId, courseId)
      )
    );

  const now = new Date();
  if (!existing) {
    await db.insert(tutorSessionSummaries).values({
      id: randomUUID(),
      studentId,
      courseId,
      askedConcepts: [...new Set(matchedConcepts)],
      questionCount: 1,
      lastSessionAt: now,
    });
    return;
  }

  const prior = Array.isArray(existing.askedConcepts)
    ? (existing.askedConcepts as string[])
    : [];
  const merged = [...new Set([...prior, ...matchedConcepts])].slice(-50);

  await db
    .update(tutorSessionSummaries)
    .set({
      askedConcepts: merged,
      questionCount: existing.questionCount + 1,
      lastSessionAt: now,
    })
    .where(eq(tutorSessionSummaries.id, existing.id));
}
