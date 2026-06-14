import { db } from "@/db";
import {
  flashcards,
  flashcardSets,
  studentFlashcardProgress,
  knowledgeObjects,
  enrollments,
} from "@/db/schema";
import { eq, and, lte, or, inArray, isNull, gt } from "drizzle-orm";
import { calculateNextReview } from "./flashcard-scheduler";
import { randomUUID } from "crypto";
import { recordLearningEvent } from "@/lib/learning-events";
import { inngest } from "@/lib/inngest";
import { markRecommendationDone } from "@/lib/recommendation-service";
import { env } from "@/lib/env";

export interface FlashcardHistoryItem {
  reviewedAt: string;
  grade: number; // 1-4
  easeFactorBefore: number;
  easeFactorAfter: number;
  intervalBeforeDays: number;
  intervalAfterDays: number;
  boxBefore: number;
  boxAfter: number;
  wasCorrect: boolean;
  isExamMode: boolean;
  examInputAnswer?: string;
  examInputPassed?: boolean;
}

// ==========================================
// STRING NORMALIZATION FOR EXAM GRADERS
// ==========================================

function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, " ") // Replace punctuation/special chars with space
    .replace(/\s+/g, " ") // Normalize multiple spaces
    .trim();
}

/**
 * Validates if the typed answer is conceptually correct compared to the answer key.
 */
export function evaluateExamAnswer(userAnswer: string, correctAnswer: string): boolean {
  const normUser = normalizeAnswer(userAnswer);
  const normCorrect = normalizeAnswer(correctAnswer);
  if (!normUser || !normCorrect) return false;
  return normCorrect.includes(normUser) || normUser.includes(normCorrect);
}

// ==========================================
// ACTION: FETCH ACTIVE REVIEW QUEUE
// ==========================================

export async function getReviewQueue(studentId: string, courseId: string) {
  // Find published flashcard sets of this course
  const publishedSets = await db
    .select()
    .from(flashcardSets)
    .where(
      and(
        eq(flashcardSets.courseId, courseId),
        eq(flashcardSets.status, "published")
      )
    );

  if (publishedSets.length === 0) return [];

  const setIds = publishedSets.map(s => s.id);

  // Fetch all active flashcards in these sets
  const allCards = await db
    .select()
    .from(flashcards)
    .where(
      and(
        inArray(flashcards.setId, setIds),
        eq(flashcards.status, "active")
      )
    );

  if (allCards.length === 0) return [];

  const cardIds = allCards.map(c => c.id);

  // Fetch progress records
  const progressRows = await db
    .select()
    .from(studentFlashcardProgress)
    .where(
      and(
        eq(studentFlashcardProgress.studentId, studentId),
        inArray(studentFlashcardProgress.flashcardId, cardIds)
      )
    );

  const progressMap = new Map(progressRows.map(r => [r.flashcardId, r]));

  const queue: any[] = [];

  allCards.forEach(card => {
    const progress = progressMap.get(card.id);

    if (!progress) {
      // New Card (repetition count = 0, due immediately)
      queue.push({
        card,
        progress: null,
        dueStatus: "new",
        nextReviewDue: new Date(0), // Outdated timestamp ensures priority
      });
    } else {
      // Review Card: check if due date has passed
      const isDue = progress.nextReviewDue.getTime() <= Date.now();
      if (isDue) {
        queue.push({
          card,
          progress,
          dueStatus: "review",
          nextReviewDue: progress.nextReviewDue,
        });
      }
    }
  });

  // Sort queue: New cards and overdue cards first
  return queue.sort((a, b) => a.nextReviewDue.getTime() - b.nextReviewDue.getTime());
}

// ==========================================
// ACTION: SUBMIT STUDENT RECALL GRADE
// ==========================================

interface ReviewSubmissionResult {
  nextReviewDue: Date;
  nextIntervalDays: number;
  nextBox: number;
  examInputPassed?: boolean;
}

export async function submitReview(
  studentId: string,
  flashcardId: string,
  grade: number, // 1: Again, 2: Hard, 3: Good, 4: Easy
  manualAnswer?: string,
  isExamMode: boolean = false
): Promise<ReviewSubmissionResult> {
  // 1. Fetch card definition
  const [cardRecord] = await db
    .select()
    .from(flashcards)
    .where(eq(flashcards.id, flashcardId));

  if (!cardRecord) {
    throw new Error(`Flashcard not found with ID: ${flashcardId}`);
  }

  // 2. Decouple Exam Mode evaluation from SM-2 grade overrides
  let examInputPassed: boolean | undefined = undefined;
  if (isExamMode && manualAnswer) {
    examInputPassed = evaluateExamAnswer(manualAnswer, cardRecord.back);
    // Grade is NOT overridden. Standard manual self-evaluation is preserved.
  }

  const result = await db.transaction(async tx => {
    // Check if progress already exists
    const [existingProgress] = await tx
      .select()
      .from(studentFlashcardProgress)
      .where(
        and(
          eq(studentFlashcardProgress.studentId, studentId),
          eq(studentFlashcardProgress.flashcardId, flashcardId)
        )
      );

    let progressId = "";
    let currentBox = 0;
    let currentEF = 2.5;
    let currentInterval = 1;
    let lastReviewedAt: Date | null = null;
    let safetyFloorActive = false;
    let historyList: FlashcardHistoryItem[] = [];

    if (existingProgress) {
      progressId = existingProgress.id;
      currentBox = existingProgress.box;
      lastReviewedAt = existingProgress.lastReviewedAt;
      historyList = (existingProgress.history as any) as FlashcardHistoryItem[];

      const meta = (existingProgress.metadata || {}) as any;
      currentEF = meta.easeFactor ?? 2.5;
      currentInterval = meta.intervalDays ?? 1;
      safetyFloorActive = meta.safetyFloorActive ?? false;
    } else {
      progressId = `progress-${randomUUID()}`;
    }

    // 3. Compute scheduling parameters using SM-2
    const sm2 = calculateNextReview(
      grade,
      currentBox,
      currentEF,
      currentInterval,
      lastReviewedAt,
      safetyFloorActive
    );

    // 4. Update progress and append to history log
    const historyItem: FlashcardHistoryItem = {
      reviewedAt: new Date().toISOString(),
      grade,
      easeFactorBefore: currentEF,
      easeFactorAfter: sm2.nextEF,
      intervalBeforeDays: currentInterval,
      intervalAfterDays: sm2.nextIntervalDays,
      boxBefore: currentBox,
      boxAfter: sm2.nextBox,
      wasCorrect: grade > 1,
      isExamMode,
      examInputAnswer: manualAnswer,
      examInputPassed,
    };

    const updatedHistory = [...historyList, historyItem];

    const metadataPayload = {
      easeFactor: sm2.nextEF,
      intervalDays: sm2.nextIntervalDays,
      safetyFloorActive: sm2.safetyFloorActive,
    };

    if (existingProgress) {
      await tx
        .update(studentFlashcardProgress)
        .set({
          box: sm2.nextBox,
          nextReviewDue: sm2.nextReviewDue,
          lastReviewedAt: new Date(),
          history: updatedHistory,
          metadata: metadataPayload,
        })
        .where(eq(studentFlashcardProgress.id, progressId));
    } else {
      await tx.insert(studentFlashcardProgress).values({
        id: progressId,
        studentId,
        flashcardId,
        box: sm2.nextBox,
        nextReviewDue: sm2.nextReviewDue,
        lastReviewedAt: new Date(),
        history: updatedHistory,
        metadata: metadataPayload,
      });
    }

    return {
      nextReviewDue: sm2.nextReviewDue,
      nextIntervalDays: sm2.nextIntervalDays,
      nextBox: sm2.nextBox,
      examInputPassed,
    };
  });

  // Record learning event (grade 1=Again→0, 2=Hard→0.5, 3/4=Good/Easy→1)
  const correctness = grade === 1 ? 0 : grade === 2 ? 0.5 : 1;
  const koId = cardRecord.koId ?? null;

  // Get courseId and conceptName via flashcard set + KO
  const [setRow] = await db
    .select({ courseId: flashcardSets.courseId })
    .from(flashcardSets)
    .where(eq(flashcardSets.id, cardRecord.setId))
    .limit(1);

  if (setRow) {
    let conceptName: string | null = null;
    if (koId) {
      const koRows = await db
        .select({ conceptName: knowledgeObjects.conceptName })
        .from(knowledgeObjects)
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        .where(eq(knowledgeObjects.id, koId!))
        .limit(1);
      conceptName = koRows[0]?.conceptName ?? null;
    }

    await Promise.all([
      recordLearningEvent({
        studentId,
        courseId: setRow.courseId,
        eventType: "flashcard_review",
        koId,
        conceptName,
        correctness,
      }),
      inngest.send({
        name: "mastery/recompute.requested",
        data: { studentId, courseId: setRow.courseId },
      }),
    ]);
  }

  // Auto-complete today's flashcard recommendation if no more due cards
  if (env.FEATURE_TODAY === "1") {
    Promise.resolve().then(async () => {
      const now = new Date();
      const remaining = await db
        .selectDistinct({ id: flashcards.id })
        .from(flashcards)
        .innerJoin(flashcardSets, eq(flashcards.setId, flashcardSets.id))
        .innerJoin(
          enrollments,
          and(
            eq(flashcardSets.courseId, enrollments.courseId),
            eq(enrollments.userId, studentId),
            gt(enrollments.expiresAt, now)
          )
        )
        .leftJoin(
          studentFlashcardProgress,
          and(
            eq(studentFlashcardProgress.flashcardId, flashcards.id),
            eq(studentFlashcardProgress.studentId, studentId)
          )
        )
        .where(
          and(
            eq(flashcards.status, "active"),
            eq(flashcardSets.status, "published"),
            or(
              isNull(studentFlashcardProgress.id),
              lte(studentFlashcardProgress.nextReviewDue, now)
            )
          )
        )
        .limit(1);
      if (remaining.length === 0) {
        await markRecommendationDone("flashcards", studentId);
      }
    }).catch(() => {});
  }

  return result;
}
