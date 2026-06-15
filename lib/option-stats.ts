/**
 * EIF E1: distractor analytics aggregation.
 *
 * Per-option selection counters for each question. The question-level attempt
 * denominator is stored at the sentinel optionIndex -1, so a percentage is
 * selectedCount(option) / totalAttempts(optionIndex -1). Pure SQL, no AI.
 */
import { db } from "@/db";
import { questionOptionStats } from "@/db/schema";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

/** Sentinel row holding the question-level attempt count (the percentage denominator). */
export const QUESTION_TOTAL_INDEX = -1;

export interface AnsweredQuestion {
  questionId: string;
  selectedOptions: number[];
}

async function bump(
  questionId: string,
  courseId: string,
  optionIndex: number,
  selectedDelta: number,
  totalDelta: number,
): Promise<void> {
  await db
    .insert(questionOptionStats)
    .values({
      id: randomUUID(),
      questionId,
      courseId,
      optionIndex,
      selectedCount: selectedDelta,
      totalAttempts: totalDelta,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [questionOptionStats.questionId, questionOptionStats.optionIndex],
      set: {
        selectedCount: sql`${questionOptionStats.selectedCount} + ${selectedDelta}`,
        totalAttempts: sql`${questionOptionStats.totalAttempts} + ${totalDelta}`,
        updatedAt: new Date(),
      },
    });
}

/**
 * Records one completed attempt's answers. Increments the question-level
 * denominator once per answered question, and selectedCount once per chosen
 * option. Call exactly once per attempt (the submit handler runs only on the
 * in_progress -> completed transition, so there is no double count).
 */
export async function recordQuestionOptionStats(
  courseId: string,
  answered: AnsweredQuestion[],
): Promise<void> {
  for (const a of answered) {
    await bump(a.questionId, courseId, QUESTION_TOTAL_INDEX, 0, 1);
    for (const opt of a.selectedOptions) {
      if (opt < 0) continue;
      await bump(a.questionId, courseId, opt, 1, 0);
    }
  }
}
