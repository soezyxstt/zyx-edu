import { db } from "@/db";
import { flashcards, flashcardSets, studentFlashcardProgress } from "@/db/schema";
import { and, eq, lte, or, isNull, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function getStudentFlashcardProgress(studentId: string, flashcardId: string) {
  const [row] = await db
    .select()
    .from(studentFlashcardProgress)
    .where(
      and(
        eq(studentFlashcardProgress.studentId, studentId),
        eq(studentFlashcardProgress.flashcardId, flashcardId)
      )
    )
    .limit(1);
  return row || null;
}

export async function upsertStudentFlashcardProgress(progress: {
  studentId: string;
  flashcardId: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueDate: Date;
  lastReviewedAt?: Date;
  box?: number;
  nextReviewDue?: Date;
  history?: any;
  metadata?: any;
}) {
  const now = new Date();
  const existing = await getStudentFlashcardProgress(progress.studentId, progress.flashcardId);

  const dataToSave = {
    studentId: progress.studentId,
    flashcardId: progress.flashcardId,
    easeFactor: progress.easeFactor,
    intervalDays: progress.intervalDays,
    repetitions: progress.repetitions,
    lapses: progress.lapses,
    dueDate: progress.dueDate,
    lastReviewedAt: progress.lastReviewedAt || now,
    updatedAt: now,
  };

  if (existing) {
    await db
      .update(studentFlashcardProgress)
      .set(dataToSave)
      .where(eq(studentFlashcardProgress.id, existing.id));
    return { ...existing, ...dataToSave };
  } else {
    const newId = `progress-${randomUUID()}`;
    const newRow = {
      id: newId,
      createdAt: now,
      ...dataToSave,
    };
    await db.insert(studentFlashcardProgress).values(newRow);
    return newRow;
  }
}

export async function getDueFlashcards(studentId: string, courseId: string, limit?: number) {
  const now = new Date();
  
  // Find published sets for this course
  const publishedSets = await db
    .select({ id: flashcardSets.id })
    .from(flashcardSets)
    .where(
      and(
        eq(flashcardSets.courseId, courseId),
        eq(flashcardSets.status, "published")
      )
    );

  if (publishedSets.length === 0) return [];
  const setIds = publishedSets.map(s => s.id);

  // Fetch due cards (either no progress row or dueDate <= now)
  const query = db
    .select({
      card: flashcards,
      progress: studentFlashcardProgress,
    })
    .from(flashcards)
    .leftJoin(
      studentFlashcardProgress,
      and(
        eq(studentFlashcardProgress.flashcardId, flashcards.id),
        eq(studentFlashcardProgress.studentId, studentId)
      )
    )
    .where(
      and(
        inArray(flashcards.setId, setIds),
        eq(flashcards.status, "active"),
        or(
          isNull(studentFlashcardProgress.id),
          lte(studentFlashcardProgress.dueDate, now)
        )
      )
    );

  if (limit) {
    query.limit(limit);
  }

  const results = await query;
  return results.map(r => ({
    ...r.card,
    progress: r.progress,
  }));
}
