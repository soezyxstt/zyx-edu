/**
 * Continuous Improvement: deterministic content-quality auditing.
 * Closes docs/audit/admin-knowledge-infrastructure-audit.md item 7 — the
 * student-performance data already existed (questionOptionStats), nothing
 * computed into aiQuestionBank.qualityScore or surfaced flagged content.
 *
 * Pure SQL aggregation over existing data, no AI calls, per AGENT_CONTEXT.md's
 * zero-AI-for-analytics rule.
 */

import { db } from "@/db";
import { aiQuestionBank, contentQualityFlags } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { questionOptionStats } from "@/db/schema";
import { QUESTION_TOTAL_INDEX } from "@/lib/option-stats";
import { randomUUID } from "crypto";

const MIN_SAMPLE_SIZE = 5;
const TOO_EASY_THRESHOLD = 0.9; // correct-rate above this is suspiciously easy
const TOO_HARD_THRESHOLD = 0.2; // correct-rate below this is suspiciously hard (or miskeyed)
const DEAD_DISTRACTOR_THRESHOLD = 0.02; // a wrong option picked by fewer than 2% of attempts

export interface ContentQualityFlag {
  questionId: string;
  flagType: "too_easy" | "too_hard" | "dead_distractor";
  detail: Record<string, unknown>;
  sampleSize: number;
}

/**
 * Audits every published question in a course against real attempt data and
 * writes findings into content_quality_flags, lowering qualityScore for
 * flagged questions. Designed to run on a cron, same shape as
 * courseAnalyticsSnapshotCron in lib/inngest-functions.ts.
 */
export async function auditCourseContentQuality(courseId: string): Promise<ContentQualityFlag[]> {
  const questions = await db
    .select({
      id: aiQuestionBank.id,
      options: aiQuestionBank.options,
      correctIndices: aiQuestionBank.correctIndices,
    })
    .from(aiQuestionBank)
    .where(and(eq(aiQuestionBank.courseId, courseId), eq(aiQuestionBank.reviewStatus, "published")));

  if (questions.length === 0) return [];

  const statRows = await db
    .select()
    .from(questionOptionStats)
    .where(inArray(questionOptionStats.questionId, questions.map((q) => q.id)));

  const statsByQuestion = new Map<string, typeof statRows>();
  for (const row of statRows) {
    const arr = statsByQuestion.get(row.questionId) ?? [];
    arr.push(row);
    statsByQuestion.set(row.questionId, arr);
  }

  const flags: ContentQualityFlag[] = [];

  for (const q of questions) {
    const stats = statsByQuestion.get(q.id) ?? [];
    const totalAttempts = stats.find((s) => s.optionIndex === QUESTION_TOTAL_INDEX)?.totalAttempts ?? 0;
    if (totalAttempts < MIN_SAMPLE_SIZE) continue;

    const correctIndices = new Set((q.correctIndices as number[]) ?? []);
    const correctSelections = stats
      .filter((s) => s.optionIndex !== QUESTION_TOTAL_INDEX && correctIndices.has(s.optionIndex))
      .reduce((sum, s) => sum + s.selectedCount, 0);
    const correctRate = correctSelections / totalAttempts;

    if (correctRate >= TOO_EASY_THRESHOLD) {
      flags.push({
        questionId: q.id,
        flagType: "too_easy",
        detail: { correctRate: Math.round(correctRate * 100) / 100 },
        sampleSize: totalAttempts,
      });
    } else if (correctRate <= TOO_HARD_THRESHOLD) {
      flags.push({
        questionId: q.id,
        flagType: "too_hard",
        detail: { correctRate: Math.round(correctRate * 100) / 100 },
        sampleSize: totalAttempts,
      });
    }

    const optionCount = Array.isArray(q.options) ? q.options.length : 0;
    for (let i = 0; i < optionCount; i++) {
      if (correctIndices.has(i)) continue; // only distractors (wrong options) can be "dead"
      const selected = stats.find((s) => s.optionIndex === i)?.selectedCount ?? 0;
      const pickRate = selected / totalAttempts;
      if (pickRate <= DEAD_DISTRACTOR_THRESHOLD) {
        flags.push({
          questionId: q.id,
          flagType: "dead_distractor",
          detail: { optionIndex: i, pickRate: Math.round(pickRate * 1000) / 1000 },
          sampleSize: totalAttempts,
        });
      }
    }
  }

  if (flags.length === 0) return flags;

  await db.transaction(async (tx) => {
    for (const flag of flags) {
      await tx
        .insert(contentQualityFlags)
        .values({
          id: randomUUID(),
          courseId,
          questionId: flag.questionId,
          flagType: flag.flagType,
          detail: flag.detail,
          sampleSize: flag.sampleSize,
        })
        .onConflictDoUpdate({
          target: [contentQualityFlags.questionId, contentQualityFlags.flagType],
          set: { detail: flag.detail, sampleSize: flag.sampleSize, updatedAt: new Date() },
        });
    }

    // Lower qualityScore proportionally to how many distinct issues a question has.
    const issuesByQuestion = new Map<string, number>();
    for (const f of flags) {
      issuesByQuestion.set(f.questionId, (issuesByQuestion.get(f.questionId) ?? 0) + 1);
    }
    for (const [questionId, issueCount] of issuesByQuestion.entries()) {
      const score = Math.max(0.2, 1 - issueCount * 0.25);
      await tx.update(aiQuestionBank).set({ qualityScore: score }).where(eq(aiQuestionBank.id, questionId));
    }
  });

  return flags;
}
