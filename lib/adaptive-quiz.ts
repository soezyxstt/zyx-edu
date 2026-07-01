/**
 * Adaptive Quiz difficulty mix. Closes the audit's "Adaptive Quiz" gap
 * (docs/audit/student-personalization-tutor-audit.md, item 5): quiz attempts
 * previously always used a template's static difficulty_proportions (or a
 * hardcoded 30/50/20 default), with zero per-student adaptation.
 *
 * Deterministic SQL over existing studentConceptMastery data, no AI involved,
 * per AGENT_CONTEXT.md's zero-AI-for-recommendations rule. Only applies when
 * a template does NOT explicitly set difficulty_proportions — an admin who
 * deliberately authored a fixed-ratio exam blueprint is respected as-is.
 */

import { db } from "@/db";
import { studentConceptMastery } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export interface DifficultyProportions {
  easy: number;
  medium: number;
  hard: number;
}

const DEFAULT_PROPORTIONS = (totalCount: number): DifficultyProportions => ({
  easy: Math.round(totalCount * 0.3),
  medium: Math.round(totalCount * 0.5),
  hard: totalCount - Math.round(totalCount * 0.3) - Math.round(totalCount * 0.5),
});

/**
 * Returns a difficulty mix biased by the student's average concept mastery in
 * this course. Low mastery skews easier (more scaffolding before the harder
 * questions), high mastery skews harder (avoid wasting attempts on questions
 * the student has already demonstrated they can answer).
 */
export async function getAdaptiveDifficultyProportions(
  studentId: string,
  courseId: string,
  totalCount: number,
): Promise<DifficultyProportions> {
  const masteryRows = await db
    .select({ masteryScore: studentConceptMastery.masteryScore })
    .from(studentConceptMastery)
    .where(and(eq(studentConceptMastery.studentId, studentId), eq(studentConceptMastery.courseId, courseId)));

  if (masteryRows.length === 0) {
    // New student, no mastery evidence yet: use the standard baseline mix.
    return DEFAULT_PROPORTIONS(totalCount);
  }

  const avgMastery = masteryRows.reduce((sum, r) => sum + r.masteryScore, 0) / masteryRows.length;

  let weights: DifficultyProportions;
  if (avgMastery < 35) {
    weights = { easy: 0.5, medium: 0.4, hard: 0.1 };
  } else if (avgMastery > 65) {
    weights = { easy: 0.15, medium: 0.45, hard: 0.4 };
  } else {
    weights = { easy: 0.3, medium: 0.5, hard: 0.2 };
  }

  const easy = Math.round(totalCount * weights.easy);
  const medium = Math.round(totalCount * weights.medium);
  const hard = totalCount - easy - medium;
  return { easy, medium, hard: Math.max(0, hard) };
}
