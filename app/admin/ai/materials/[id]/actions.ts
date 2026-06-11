"use server";

import { db } from "@/db";
import {
  knowledgeObjects,
  websiteMaterials,
  chapters,
  flashcardSets,
  aiQuestionBank,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { generateFlashcardsForChapter } from "@/lib/flashcard-generator";
import { generateQuestionsForKO, generateQuestionsForKOBatch } from "@/lib/question-generator";
import { inngest } from "@/lib/inngest";

export async function generateFlashcardsAction(chapterId: string) {
  try {
    const cardCount = await generateFlashcardsForChapter(chapterId);
    return { success: true, count: cardCount };
  } catch (error: any) {
    console.error("Error generating flashcards:", error);
    return { success: false, error: error.message || "Failed to generate flashcards." };
  }
}

export async function generateQuizPoolAction(chapterId: string) {
  try {
    const activeKOs = await db
      .select()
      .from(knowledgeObjects)
      .where(
        and(
          eq(knowledgeObjects.chapterId, chapterId),
          eq(knowledgeObjects.status, "active")
        )
      );

    if (activeKOs.length === 0) {
      return { success: false, error: "No active Knowledge Objects found in this chapter." };
    }

    let totalGenerated = 0;
    const errors: string[] = [];

    const BATCH_SIZE = 5;
    for (let i = 0; i < activeKOs.length; i += BATCH_SIZE) {
      const koBatch = activeKOs.slice(i, i + BATCH_SIZE);
      const koIds = koBatch.map((ko) => ko.id);
      
      const res = await generateQuestionsForKOBatch(koIds);
      for (const result of res.results) {
        if (result.success) {
          totalGenerated += result.insertedCount;
        } else {
          errors.push(...result.errors);
        }
      }
    }

    return { success: true, count: totalGenerated, errors };
  } catch (error: any) {
    console.error("Error generating quiz pool:", error);
    return { success: false, error: error.message || "Failed to generate questions." };
  }
}

export async function updateKOAction(
  koId: string,
  updates: {
    conceptName: string;
    title: string;
    content: string;
    difficulty: "easy" | "medium" | "hard";
    type: "definition" | "formula" | "example" | "misconception" | "exercise" | "summary" | "objective" | "concept_overview";
    bloomLevel: "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";
    importance: "high" | "medium" | "low";
  }
) {
  try {
    // 1. Update the KO itself
    await db
      .update(knowledgeObjects)
      .set({
        conceptName: updates.conceptName,
        title: updates.title,
        content: updates.content,
        difficulty: updates.difficulty,
        type: updates.type,
        bloomLevel: updates.bloomLevel,
        importance: updates.importance,
        updatedAt: new Date(),
      })
      .where(eq(knowledgeObjects.id, koId));

    // 2. Find the chapterId of this KO
    const [koRecord] = await db
      .select({ chapterId: knowledgeObjects.chapterId })
      .from(knowledgeObjects)
      .where(eq(knowledgeObjects.id, koId));

    if (koRecord?.chapterId) {
      // 3. Mark the websiteMaterial for this chapter as stale
      await db
        .update(websiteMaterials)
        .set({
          isStale: true,
          updatedAt: new Date(),
        })
        .where(eq(websiteMaterials.chapterId, koRecord.chapterId));
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error updating Knowledge Object:", error);
    return { success: false, error: error.message || "Failed to update Knowledge Object." };
  }
}

export async function toggleChapterPublishAction(chapterId: string, publish: boolean) {
  try {
    await db.transaction(async (tx) => {
      // Update chapter status
      await tx
        .update(chapters)
        .set({
          status: publish ? "published" : "draft",
          updatedAt: new Date(),
        })
        .where(eq(chapters.id, chapterId));

      // Also update matching websiteMaterial status
      await tx
        .update(websiteMaterials)
        .set({
          status: publish ? "published" : "draft",
          updatedAt: new Date(),
        })
        .where(eq(websiteMaterials.chapterId, chapterId));

      // Also update matching flashcardSets status
      await tx
        .update(flashcardSets)
        .set({
          status: publish ? "published" : "draft",
          updatedAt: new Date(),
        })
        .where(eq(flashcardSets.chapterId, chapterId));

      // Get KOs for this chapter to publish/draft their quiz questions
      const chapterKOs = await tx
        .select({ id: knowledgeObjects.id })
        .from(knowledgeObjects)
        .where(eq(knowledgeObjects.chapterId, chapterId));

      if (chapterKOs.length > 0) {
        const koIds = chapterKOs.map((ko) => ko.id);
        await tx
          .update(aiQuestionBank)
          .set({
            reviewStatus: publish ? "published" : "generated",
          })
          .where(inArray(aiQuestionBank.knowledgeObjectId, koIds));
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error toggling chapter publish status:", error);
    return { success: false, error: error.message || "Failed to update publish status." };
  }
}

export async function regenerateWebsiteMaterialAction(chapterId: string) {
  try {
    await db
      .update(websiteMaterials)
      .set({
        isStale: false,
        updatedAt: new Date(),
      })
      .where(eq(websiteMaterials.chapterId, chapterId));
    return { success: true };
  } catch (error: any) {
    console.error("Error regenerating website material:", error);
    return { success: false, error: error.message || "Failed to regenerate." };
  }
}

export async function triggerBulkChapterGenerationAction(chapterId: string) {
  try {
    await inngest.send({
      name: "ai.bulk.chapter.generate",
      data: { chapterId },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error triggering bulk chapter generation:", error);
    return { success: false, error: error.message || "Failed to trigger bulk generation." };
  }
}

export async function getChapterAssetGenProgressAction(chapterId: string) {
  try {
    const [chapter] = await db
      .select({
        status: chapters.assetGenStatus,
        flashcardsTotal: chapters.assetGenFlashcardsTotal,
        flashcardsCurrent: chapters.assetGenFlashcardsCurrent,
        questionsTotal: chapters.assetGenQuestionsTotal,
        questionsCurrent: chapters.assetGenQuestionsCurrent,
        error: chapters.assetGenError,
      })
      .from(chapters)
      .where(eq(chapters.id, chapterId));

    if (!chapter) {
      return { success: false, error: "Chapter not found." };
    }

    return {
      success: true,
      progress: {
        status: chapter.status,
        flashcardsTotal: chapter.flashcardsTotal,
        flashcardsCurrent: chapter.flashcardsCurrent,
        questionsTotal: chapter.questionsTotal,
        questionsCurrent: chapter.questionsCurrent,
        error: chapter.error,
      },
    };
  } catch (error: any) {
    console.error("Error fetching asset generation progress:", error);
    return { success: false, error: error.message || "Failed to fetch progress." };
  }
}
