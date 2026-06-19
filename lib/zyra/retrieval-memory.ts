import type { RetrievalMemory, TutorSource } from "./memory-layers";
import { vectorStore, VECTOR_NAMESPACES } from "@/lib/vector-store";
import { db } from "@/db";
import { knowledgeObjects } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export interface RetrievalMemoryInput {
  courseId: string;
  chapterId: string | null;
  question: string;
}

export async function getRetrievalMemory(input: RetrievalMemoryInput): Promise<RetrievalMemory> {
  const { courseId, chapterId, question } = input;

  const sources: TutorSource[] = [];

  try {
    const learningMatches = await vectorStore.query(
      `${courseId}_${VECTOR_NAMESPACES.learning}`,
      question,
      {
        topK: 5,
        ...(chapterId ? { filter: { chapterId } } : {}),
      }
    );

    const relevantLearning = learningMatches.filter((m) => m.score >= 0.5);

    if (relevantLearning.length > 0) {
      const koIds = relevantLearning.map((m) => m.id);

      const koRows = await db
        .select()
        .from(knowledgeObjects)
        .where(
          and(
            inArray(knowledgeObjects.id, koIds),
            eq(knowledgeObjects.status, "active")
          )
        );

      const byId = new Map(koRows.map((ko) => [ko.id, ko]));

      for (const match of relevantLearning) {
        const ko = byId.get(match.id);
        if (ko) {
          sources.push({
            type: "ko",
            id: ko.id,
            label: ko.title,
            href: `/courses/${courseId}/material`,
          });
        }
      }
    }
  } catch (err) {
    console.error("[retrieval-memory] Failed to retrieve vector memory:", err);
  }

  return {
    sources,
    retrievedAt: new Date(),
    query: question,
  };
}