import { db } from "@/db";
import { studentConceptMastery, studentChapterMastery, chapters } from "@/db/schema";
import { and, eq, desc, asc, avg } from "drizzle-orm";
import type { MasteryMemory, WeakConcept } from "./memory-layers";

const TOP_N = 5;

export interface MasteryMemoryInput {
  studentId: string;
  courseId: string;
}

export interface MasteryProvider {
  getMasteryMemory(input: MasteryMemoryInput): Promise<MasteryMemory>;
}

export const DEFAULT_MASTERY_MEMORY: MasteryMemory = {
  strongestConcepts: [],
  weakestConcepts: [],
  chapterMastery: [],
  overallMasteryScore: 0,
};

/**
 * Real implementation: was previously a stub always returning empty defaults,
 * silently starving lib/zyra/zyra-context-builder.ts's masteryMemory layer
 * (see docs/audit/student-personalization-tutor-audit.md, item 2).
 */
export async function getMasteryMemory(input: MasteryMemoryInput): Promise<MasteryMemory> {
  const { studentId, courseId } = input;

  const [strongestRows, weakestRows, chapterRows, overallRow] = await Promise.all([
    db
      .select({ conceptName: studentConceptMastery.conceptName, masteryScore: studentConceptMastery.masteryScore })
      .from(studentConceptMastery)
      .where(and(eq(studentConceptMastery.studentId, studentId), eq(studentConceptMastery.courseId, courseId)))
      .orderBy(desc(studentConceptMastery.masteryScore))
      .limit(TOP_N),

    db
      .select({ conceptName: studentConceptMastery.conceptName, masteryScore: studentConceptMastery.masteryScore })
      .from(studentConceptMastery)
      .where(and(eq(studentConceptMastery.studentId, studentId), eq(studentConceptMastery.courseId, courseId)))
      .orderBy(asc(studentConceptMastery.masteryScore))
      .limit(TOP_N),

    db
      .select({
        chapterId: studentChapterMastery.chapterId,
        chapterTitle: chapters.title,
        masteryScore: studentChapterMastery.masteryScore,
        confidence: studentChapterMastery.confidence,
      })
      .from(studentChapterMastery)
      .innerJoin(chapters, eq(studentChapterMastery.chapterId, chapters.id))
      .where(and(eq(studentChapterMastery.studentId, studentId), eq(studentChapterMastery.courseId, courseId)))
      .orderBy(asc(chapters.orderIndex)),

    db
      .select({ avgMastery: avg(studentConceptMastery.masteryScore) })
      .from(studentConceptMastery)
      .where(and(eq(studentConceptMastery.studentId, studentId), eq(studentConceptMastery.courseId, courseId))),
  ]);

  if (strongestRows.length === 0) {
    return DEFAULT_MASTERY_MEMORY;
  }

  const strongestConcepts: WeakConcept[] = strongestRows.map((r) => ({
    conceptName: r.conceptName,
    masteryScore: r.masteryScore,
  }));
  const weakestConcepts: WeakConcept[] = weakestRows.map((r) => ({
    conceptName: r.conceptName,
    masteryScore: r.masteryScore,
  }));

  return {
    strongestConcepts,
    weakestConcepts,
    chapterMastery: chapterRows.map((r) => ({
      chapterId: r.chapterId,
      chapterTitle: r.chapterTitle,
      masteryScore: r.masteryScore,
      confidence: r.confidence,
    })),
    overallMasteryScore: Math.round(Number(overallRow[0]?.avgMastery) || 0),
  };
}

export function createMasteryMemory(
  strongest: WeakConcept[],
  weakest: WeakConcept[],
  chapterMastery: MasteryMemory["chapterMastery"],
  overallScore: number
): MasteryMemory {
  return {
    strongestConcepts: strongest,
    weakestConcepts: weakest,
    chapterMastery,
    overallMasteryScore: overallScore,
  };
}
