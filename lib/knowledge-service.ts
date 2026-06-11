import { db } from "@/db";
import { knowledgeObjects, knowledgeRelationships } from "@/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";

export class KnowledgeService {
  /**
   * Retrieves a single Knowledge Object by ID.
   */
  static async getKO(koId: string) {
    const [ko] = await db
      .select()
      .from(knowledgeObjects)
      .where(eq(knowledgeObjects.id, koId));
    return ko || null;
  }

  /**
   * Retrieves active Knowledge Objects inside a chapter ordered by learning order.
   */
  static async getChapterKOs(chapterId: string) {
    return db
      .select()
      .from(knowledgeObjects)
      .where(
        and(
          eq(knowledgeObjects.chapterId, chapterId),
          eq(knowledgeObjects.status, "active")
        )
      )
      .orderBy(asc(knowledgeObjects.learningOrder));
  }

  /**
   * Retrieves KOs related via direct graph edges in the knowledge relationships graph.
   */
  static async getRelatedKOs(koId: string) {
    const edges = await db
      .select()
      .from(knowledgeRelationships)
      .where(eq(knowledgeRelationships.sourceKoId, koId));

    if (edges.length === 0) return [];

    const targetIds = edges.map(e => e.targetKoId);
    return db
      .select()
      .from(knowledgeObjects)
      .where(
        and(
          inArray(knowledgeObjects.id, targetIds),
          eq(knowledgeObjects.status, "active")
        )
      );
  }
}
