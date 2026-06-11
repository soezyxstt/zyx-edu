"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { TutorActionService } from "@/lib/tutor-actions";
import { db } from "@/db";
import { aiQuestionBank, knowledgeObjects } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { exams } from "@/lib/student-course-fixtures";

async function requireUser() {
  const h = await headers();
  const session = await auth.api.getSession({
    headers: h,
  });
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function explainConceptAction(
  koId: string,
  mode: "content" | "analogy" | "simplification"
) {
  const user = await requireUser();
  return TutorActionService.explainConcept(koId, user.id, mode);
}

export async function analyzeMistakeAction(
  questionId: string,
  userAnswerOrIndex: string | number
) {
  const user = await requireUser();
  let selectedIndex = 0;

  if (typeof userAnswerOrIndex === "number") {
    selectedIndex = userAnswerOrIndex;
  } else {
    // Look up options in aiQuestionBank first
    try {
      const [dbQuestion] = await db
        .select()
        .from(aiQuestionBank)
        .where(eq(aiQuestionBank.id, questionId));

      let options: string[] = [];
      if (dbQuestion && Array.isArray(dbQuestion.options)) {
        options = dbQuestion.options as string[];
      } else {
        // Fallback: look up in mock exams
        for (const exam of exams) {
          const q = exam.questions.find((quest: any) => quest.id === questionId);
          if (q && "options" in q) {
            options = q.options;
            break;
          }
        }
      }

      if (options.length > 0) {
        // Find exact or trimmed match
        const cleanedAnswer = userAnswerOrIndex.trim().toLowerCase();
        const idx = options.findIndex(
          (opt) => opt.trim().toLowerCase() === cleanedAnswer
        );
        if (idx !== -1) {
          selectedIndex = idx;
        } else {
          // Fallback: try parsing index if it's a number string
          const parsed = parseInt(userAnswerOrIndex, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed < options.length) {
            selectedIndex = parsed;
          }
        }
      }
    } catch (e) {
      console.error("Error resolving selectedIndex for analyzeMistake:", e);
    }
  }

  return TutorActionService.analyzeMistake(questionId, selectedIndex, user.id);
}

export async function buildStudyPlanAction() {
  const user = await requireUser();
  return TutorActionService.buildStudyPlan(user.id);
}

export async function generatePracticeQuizAction(koId: string, difficulty: string) {
  await requireUser();
  return TutorActionService.generatePracticeQuiz(koId, difficulty);
}

export async function reviewWeakConceptsAction() {
  const user = await requireUser();
  return TutorActionService.reviewWeakConcepts(user.id);
}

export async function startFlashcardReviewAction(koId: string) {
  const user = await requireUser();
  return TutorActionService.startFlashcardReview(koId, user.id);
}

export async function openMaterialAction(chapterId: string, sectionId: string) {
  await requireUser();
  return TutorActionService.openMaterial(chapterId, sectionId);
}

export async function findKoForMaterialSectionAction(courseId: string, selectedText: string) {
  await requireUser();
  
  if (!selectedText || selectedText.trim().length < 3) {
    return { success: false, error: "Text too short" };
  }
  
  const text = selectedText.trim().toLowerCase();
  
  try {
    // Fetch KOs for this course
    const kos = await db
      .select()
      .from(knowledgeObjects)
      .where(
        and(
          eq(knowledgeObjects.courseId, courseId),
          eq(knowledgeObjects.status, "active")
        )
      );

    // 1. Try exact or substring match on conceptName
    let bestMatch = kos.find(ko => ko.conceptName.toLowerCase().includes(text) || text.includes(ko.conceptName.toLowerCase()));
    
    // 2. Try matching the title
    if (!bestMatch) {
      bestMatch = kos.find(ko => ko.title.toLowerCase().includes(text) || text.includes(ko.title.toLowerCase()));
    }

    // 3. Try matching content keywords
    if (!bestMatch) {
      bestMatch = kos.find(ko => ko.content.toLowerCase().includes(text));
    }

    if (bestMatch) {
      return { success: true, koId: bestMatch.id };
    }

    // Fallback: If no match found, check if there is any KO in this course at all
    if (kos.length > 0) {
      return { success: true, koId: kos[0].id };
    }
  } catch (e) {
    console.error("Error in findKoForMaterialSectionAction:", e);
  }

  return { success: false, error: "No KOs found for this course" };
}
