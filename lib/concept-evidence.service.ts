import { db } from "@/db";
import { learningEvents, knowledgeObjects } from "@/db/schema";
import { inArray } from "drizzle-orm";

export interface ConceptEvidence {
  conceptName: string;
  eventType: "quiz_answer" | "flashcard_review" | "material_completed" | "tutor_question";
  correctness: number; // 0 to 1
  weight: number;      // positive multiplier
  createdAt: Date;
}

export class ConceptEvidenceService {
  /**
   * Maps a batch of raw learning events to ConceptEvidence structures, resolving
   * concept names from knowledge objects if the event itself does not have it.
   */
  static async mapEventsToEvidence(
    events: Array<typeof learningEvents.$inferSelect>
  ): Promise<ConceptEvidence[]> {
    const evidenceList: ConceptEvidence[] = [];

    // Identify events that have a koId but are missing conceptName
    const missingKoIds = events
      .filter((e) => !e.conceptName && e.koId)
      .map((e) => e.koId as string);

    const koIdToConceptMap = new Map<string, string>();
    if (missingKoIds.length > 0) {
      const kos = await db
        .select({ id: knowledgeObjects.id, conceptName: knowledgeObjects.conceptName })
        .from(knowledgeObjects)
        .where(inArray(knowledgeObjects.id, missingKoIds));
      
      for (const ko of kos) {
        koIdToConceptMap.set(ko.id, ko.conceptName.trim());
      }
    }

    for (const ev of events) {
      let conceptName = ev.conceptName?.trim();
      if (!conceptName && ev.koId) {
        conceptName = koIdToConceptMap.get(ev.koId);
      }

      if (!conceptName) {
        // Skip events that cannot be resolved to any concept
        continue;
      }

      // Map eventTypes with default correctness if null
      let correctness = ev.correctness !== null ? Number(ev.correctness) : 1.0;
      
      // Default weight depending on eventType
      let weight = ev.weight !== null ? Number(ev.weight) : 1.0;

      // Make sure correctness is strictly bounded between 0 and 1
      correctness = Math.max(0, Math.min(1, correctness));

      evidenceList.push({
        conceptName,
        eventType: ev.eventType,
        correctness,
        weight,
        createdAt: ev.createdAt,
      });
    }

    return evidenceList;
  }
}
