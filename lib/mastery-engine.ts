import { db } from "@/db";
import {
  studentConceptMastery,
  studentChapterMastery,
  knowledgeObjects,
  learningEvents,
} from "@/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { ConceptEvidenceService, ConceptEvidence } from "./concept-evidence.service";

export interface ExplanationPayload {
  conceptName: string;
  masteryScore: number;
  confidence: number;
  evidenceCount: number;
  diversityCount: number;
  trend: "improving" | "stable" | "declining";
  contributions: Array<{
    eventType: string;
    weight: number;
    correctness: number;
    ageDays: number;
    effectiveWeight: number;
  }>;
}

export class MasteryEngine {
  /**
   * Recalculates and persists mastery at both the Concept and Chapter levels.
   */
  static async recomputeAll(studentId: string, courseId: string): Promise<void> {
    const now = new Date();

    // 1. Fetch all raw learning events for this student and course
    const rawEvents = await db
      .select()
      .from(learningEvents)
      .where(
        and(
          eq(learningEvents.studentId, studentId),
          eq(learningEvents.courseId, courseId)
        )
      )
      .orderBy(desc(learningEvents.createdAt));

    if (rawEvents.length === 0) {
      return;
    }

    // 2. Map raw events to ConceptEvidence using the service
    const allEvidence = await ConceptEvidenceService.mapEventsToEvidence(rawEvents);

    // Group evidence by concept name
    const conceptEvidenceMap = new Map<string, ConceptEvidence[]>();
    for (const ev of allEvidence) {
      const name = ev.conceptName;
      if (!conceptEvidenceMap.has(name)) {
        conceptEvidenceMap.set(name, []);
      }
      conceptEvidenceMap.get(name)!.push(ev);
    }

    // 3. Recompute and upsert each Concept's Mastery
    const updatedConceptMasteries = new Map<string, typeof studentConceptMastery.$inferSelect>();

    for (const [conceptName, evidenceList] of conceptEvidenceMap.entries()) {
      const metrics = this.calculateConceptMetrics(evidenceList, now);

      const existing = await db.query.studentConceptMastery.findFirst({
        where: and(
          eq(studentConceptMastery.studentId, studentId),
          eq(studentConceptMastery.courseId, courseId),
          eq(studentConceptMastery.conceptName, conceptName)
        ),
      });

      const dataToSave = {
        studentId,
        courseId,
        conceptName,
        masteryScore: metrics.masteryScore,
        confidence: Math.round(metrics.confidence * 100), // stored as integer 0-100 in concept mastery table
        evidenceCount: metrics.evidenceCount,
        trend: metrics.trend,
        lastEvidenceAt: metrics.lastEvidenceAt,
        updatedAt: now,
      };

      let conceptRow;
      if (existing) {
        await db
          .update(studentConceptMastery)
          .set(dataToSave)
          .where(eq(studentConceptMastery.id, existing.id));
        conceptRow = { ...existing, ...dataToSave };
      } else {
        const newId = `scm-${randomUUID()}`;
        conceptRow = {
          id: newId,
          ...dataToSave,
        };
        await db.insert(studentConceptMastery).values(conceptRow);
      }

      updatedConceptMasteries.set(conceptName, conceptRow);
    }

    // 4. Retrieve course Knowledge Objects to group concepts by Chapter
    const kos = await db
      .select({
        chapterId: knowledgeObjects.chapterId,
        conceptName: knowledgeObjects.conceptName,
      })
      .from(knowledgeObjects)
      .where(
        and(
          eq(knowledgeObjects.courseId, courseId),
          eq(knowledgeObjects.status, "active")
        )
      );

    // Map chapterId -> list of conceptNames
    const chapterConceptsMap = new Map<string, Set<string>>();
    for (const ko of kos) {
      if (!ko.chapterId) continue;
      const chId = ko.chapterId;
      const cName = ko.conceptName.trim();
      if (!chapterConceptsMap.has(chId)) {
        chapterConceptsMap.set(chId, new Set());
      }
      chapterConceptsMap.get(chId)!.add(cName);
    }

    // 5. Recompute and upsert each Chapter's Mastery using Concept Masteries
    for (const [chapterId, conceptNamesSet] of chapterConceptsMap.entries()) {
      const conceptNames = Array.from(conceptNamesSet);
      
      // Fetch the updated concept masteries for this chapter
      const conceptMasteries = await db
        .select()
        .from(studentConceptMastery)
        .where(
          and(
            eq(studentConceptMastery.studentId, studentId),
            eq(studentConceptMastery.courseId, courseId),
            inArray(studentConceptMastery.conceptName, conceptNames)
          )
        );

      if (conceptMasteries.length === 0) {
        continue;
      }

      // Aggregate chapter mastery metrics
      let totalMastery = 0;
      let totalConfidence = 0;
      let totalEvidenceCount = 0;
      let maxLastEvidence = new Date(0);
      let improvingCount = 0;
      let decliningCount = 0;

      for (const cm of conceptMasteries) {
        totalMastery += cm.masteryScore;
        // cm.confidence is stored as integer 0-100, we aggregate and convert back to 0-1 range for chapter confidence
        totalConfidence += cm.confidence / 100;
        totalEvidenceCount += cm.evidenceCount;
        if (cm.lastEvidenceAt.getTime() > maxLastEvidence.getTime()) {
          maxLastEvidence = cm.lastEvidenceAt;
        }

        if (cm.trend === "improving") {
          improvingCount++;
        } else if (cm.trend === "declining") {
          decliningCount++;
        }
      }

      const count = conceptMasteries.length;
      const chapterMasteryScore = Math.round(totalMastery / count);
      // confidence range: 0-1
      const chapterConfidenceScore = Number((totalConfidence / count).toFixed(4));

      let chapterTrend: "improving" | "stable" | "declining" = "stable";
      if (improvingCount > decliningCount) {
        chapterTrend = "improving";
      } else if (decliningCount > improvingCount) {
        chapterTrend = "declining";
      }

      const existingChapter = await db.query.studentChapterMastery.findFirst({
        where: and(
          eq(studentChapterMastery.studentId, studentId),
          eq(studentChapterMastery.chapterId, chapterId)
        ),
      });

      const chapterDataToSave = {
        studentId,
        courseId,
        chapterId,
        masteryScore: chapterMasteryScore,
        confidence: chapterConfidenceScore,
        evidenceCount: totalEvidenceCount,
        trend: chapterTrend,
        lastEvidenceAt: maxLastEvidence.getTime() > 0 ? maxLastEvidence : now,
        updatedAt: now,
      };

      if (existingChapter) {
        await db
          .update(studentChapterMastery)
          .set(chapterDataToSave)
          .where(eq(studentChapterMastery.id, existingChapter.id));
      } else {
        await db.insert(studentChapterMastery).values({
          id: `scm-ch-${randomUUID()}`,
          createdAt: now,
          ...chapterDataToSave,
        });
      }
    }
  }

  /**
   * Deterministic metrics calculation for a single concept.
   */
  private static calculateConceptMetrics(
    evidence: ConceptEvidence[],
    now: Date
  ): {
    masteryScore: number;
    confidence: number;
    evidenceCount: number;
    trend: "improving" | "stable" | "declining";
    lastEvidenceAt: Date;
  } {
    if (evidence.length === 0) {
      return {
        masteryScore: 0,
        confidence: 0,
        evidenceCount: 0,
        trend: "stable",
        lastEvidenceAt: now,
      };
    }

    // Sort evidence by date ascending (oldest first) for trend analysis
    const sortedEvidence = [...evidence].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const lastEvidenceAt = sortedEvidence[sortedEvidence.length - 1].createdAt;

    // 1. Calculate weighted Mastery Score using exponential time-decay
    // Lambda represents a half-life of 14 days: lambda = 0.05
    const lambda = 0.05;
    let weightedCorrectnessSum = 0;
    let weightSum = 0;

    for (const ev of sortedEvidence) {
      const ageDays = Math.max(0, (now.getTime() - ev.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const recencyWeight = Math.exp(-lambda * ageDays);
      const effectiveWeight = ev.weight * recencyWeight;

      weightedCorrectnessSum += ev.correctness * effectiveWeight;
      weightSum += effectiveWeight;
    }

    const masteryScore = weightSum > 0 ? Math.round((weightedCorrectnessSum / weightSum) * 100) : 0;

    // 2. Calculate Confidence Score
    // Logarithmic scale for evidence count: C_count = min(1.0, 0.25 * ln(1 + count))
    const uniqueTypes = new Set(evidence.map((e) => e.eventType));
    const diversityMultiplier = 0.5 + 0.125 * uniqueTypes.size; // 1 type = 0.625, ..., 4 types = 1.0
    const countConfidence = Math.min(1.0, 0.25 * Math.log(1 + evidence.length));
    const confidence = Number(Math.max(0, Math.min(1.0, countConfidence * diversityMultiplier)).toFixed(4));

    // 3. Trend Calculation
    // Split sorted evidence into two windows: first half (older) vs second half (newer)
    let trend: "improving" | "stable" | "declining" = "stable";
    if (sortedEvidence.length >= 2) {
      const mid = Math.floor(sortedEvidence.length / 2);
      const oldWindow = sortedEvidence.slice(0, mid);
      const newWindow = sortedEvidence.slice(mid);

      const oldMastery = this.calculateWeightedAverage(oldWindow, now);
      const newMastery = this.calculateWeightedAverage(newWindow, now);

      const diff = newMastery - oldMastery;
      if (diff >= 5) {
        trend = "improving";
      } else if (diff <= -5) {
        trend = "declining";
      }
    }

    return {
      masteryScore,
      confidence,
      evidenceCount: evidence.length,
      trend,
      lastEvidenceAt,
    };
  }

  /**
   * Helper to calculate simple weighted correctness percentage for a slice of evidence.
   */
  private static calculateWeightedAverage(evidence: ConceptEvidence[], now: Date): number {
    const lambda = 0.05;
    let correctnessSum = 0;
    let weightSum = 0;

    for (const ev of evidence) {
      const ageDays = Math.max(0, (now.getTime() - ev.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const recencyWeight = Math.exp(-lambda * ageDays);
      const effectiveWeight = ev.weight * recencyWeight;

      correctnessSum += ev.correctness * effectiveWeight;
      weightSum += effectiveWeight;
    }

    return weightSum > 0 ? (correctnessSum / weightSum) * 100 : 0;
  }

  /**
   * Generates a fully explainable payload detailing the calculations for a concept.
   */
  static async getExplanation(
    studentId: string,
    courseId: string,
    conceptName: string
  ): Promise<ExplanationPayload | null> {
    const now = new Date();

    const rawEvents = await db
      .select()
      .from(learningEvents)
      .where(
        and(
          eq(learningEvents.studentId, studentId),
          eq(learningEvents.courseId, courseId),
          eq(learningEvents.conceptName, conceptName)
        )
      )
      .orderBy(desc(learningEvents.createdAt));

    if (rawEvents.length === 0) return null;

    const evidenceList = await ConceptEvidenceService.mapEventsToEvidence(rawEvents);
    const metrics = this.calculateConceptMetrics(evidenceList, now);

    const lambda = 0.05;
    const contributions = evidenceList.map((ev) => {
      const ageDays = Math.max(0, (now.getTime() - ev.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const recencyWeight = Math.exp(-lambda * ageDays);
      return {
        eventType: ev.eventType,
        weight: ev.weight,
        correctness: ev.correctness,
        ageDays: Number(ageDays.toFixed(2)),
        effectiveWeight: Number((ev.weight * recencyWeight).toFixed(4)),
      };
    });

    const uniqueTypes = new Set(evidenceList.map((e) => e.eventType));

    return {
      conceptName,
      masteryScore: metrics.masteryScore,
      confidence: metrics.confidence,
      evidenceCount: metrics.evidenceCount,
      diversityCount: uniqueTypes.size,
      trend: metrics.trend,
      contributions,
    };
  }
}
