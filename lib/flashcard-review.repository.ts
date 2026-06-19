import { db } from "@/db";
import { flashcardReviews } from "@/db/schema";
import { randomUUID } from "crypto";

export async function recordFlashcardReview(review: {
  studentId: string;
  flashcardId: string;
  grade: number;
  responseTimeMs: number;
  reviewedAt?: Date;
}) {
  const newRow = {
    id: `review-${randomUUID()}`,
    studentId: review.studentId,
    flashcardId: review.flashcardId,
    grade: review.grade,
    responseTimeMs: review.responseTimeMs,
    reviewedAt: review.reviewedAt || new Date(),
  };

  await db.insert(flashcardReviews).values(newRow);
  return newRow;
}
