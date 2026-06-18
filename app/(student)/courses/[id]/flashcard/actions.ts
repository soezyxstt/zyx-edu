"use server";

import { submitReview as dbSubmitReview } from "@/lib/flashcard-actions";
import { revalidatePath } from "next/cache";

export async function submitReviewAction(
  studentId: string,
  flashcardId: string,
  grade: number,
  manualAnswer?: string,
  isExamMode: boolean = false,
  courseId?: string
) {
  const result = await dbSubmitReview(studentId, flashcardId, grade, manualAnswer, isExamMode);
  if (courseId) {
    revalidatePath(`/courses/${courseId}/flashcard`);
  }
  return result;
}
