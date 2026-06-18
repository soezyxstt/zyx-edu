import { db } from "@/db";
import { assessmentObjects, assessmentObjectConcepts } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface PatternProfile {
  conceptId: string;
  totalQuestionsCount: number;
  difficultyDistribution: {
    easy: number;   // percentage (0-100)
    medium: number;
    hard: number;
  };
  reasoningDistribution: {
    procedural: number;
    conceptual: number;
    analytical: number;
  };
  patternDistribution: Record<
    "direct_computation" | "graph_interpretation" | "proof" | "parameter_analysis" | "modeling",
    number
  >;
  averageEstimatedSteps: number;
  averageApplicationLevel: number;
}

/**
 * Compiles aggregated assessment metadata (Pattern Profile) for a given Concept ID.
 * Defaults to baseline distributions if no historical exam questions are found.
 */
export async function getPatternProfile(conceptId: string): Promise<PatternProfile> {
  const objects = await db
    .select({
      id: assessmentObjects.id,
      difficulty: assessmentObjects.difficulty,
      applicationLevel: assessmentObjects.applicationLevel,
      pattern: assessmentObjects.pattern,
      reasoningType: assessmentObjects.reasoningType,
      estimatedSteps: assessmentObjects.estimatedSteps,
    })
    .from(assessmentObjects)
    .innerJoin(
      assessmentObjectConcepts,
      eq(assessmentObjects.id, assessmentObjectConcepts.assessmentObjectId)
    )
    .where(eq(assessmentObjectConcepts.conceptId, conceptId));

  const total = objects.length;

  // Baseline standard defaults if no historical exam questions exist for this concept
  if (total === 0) {
    return {
      conceptId,
      totalQuestionsCount: 0,
      difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
      reasoningDistribution: { procedural: 50, conceptual: 30, analytical: 20 },
      patternDistribution: {
        direct_computation: 40,
        graph_interpretation: 20,
        proof: 10,
        parameter_analysis: 20,
        modeling: 10,
      },
      averageEstimatedSteps: 3,
      averageApplicationLevel: 2,
    };
  }

  // 1. Difficulty distribution (1 = easy, 2 = medium, 3 = hard)
  let easy = 0, medium = 0, hard = 0;
  for (const obj of objects) {
    if (obj.difficulty === 1) easy++;
    else if (obj.difficulty === 2) medium++;
    else if (obj.difficulty === 3) hard++;
  }

  // 2. Reasoning type distribution
  let procedural = 0, conceptual = 0, analytical = 0;
  for (const obj of objects) {
    if (obj.reasoningType === "procedural") procedural++;
    else if (obj.reasoningType === "conceptual") conceptual++;
    else if (obj.reasoningType === "analytical") analytical++;
  }

  // 3. Pattern distribution
  const patterns: Record<string, number> = {
    direct_computation: 0,
    graph_interpretation: 0,
    proof: 0,
    parameter_analysis: 0,
    modeling: 0,
  };
  
  for (const obj of objects) {
    if (obj.pattern in patterns) {
      patterns[obj.pattern]++;
    } else {
      patterns[obj.pattern] = (patterns[obj.pattern] || 0) + 1;
    }
  }

  // 4. Compute averages for estimated steps and Bloom application levels
  let totalSteps = 0;
  let totalAppLevel = 0;
  for (const obj of objects) {
    totalSteps += obj.estimatedSteps;
    totalAppLevel += obj.applicationLevel;
  }

  const pct = (val: number) => Math.round((val / total) * 100);

  return {
    conceptId,
    totalQuestionsCount: total,
    difficultyDistribution: {
      easy: pct(easy),
      medium: pct(medium),
      hard: pct(hard),
    },
    reasoningDistribution: {
      procedural: pct(procedural),
      conceptual: pct(conceptual),
      analytical: pct(analytical),
    },
    patternDistribution: {
      direct_computation: pct(patterns.direct_computation),
      graph_interpretation: pct(patterns.graph_interpretation),
      proof: pct(patterns.proof),
      parameter_analysis: pct(patterns.parameter_analysis),
      modeling: pct(patterns.modeling),
    } as any,
    averageEstimatedSteps: Math.round(totalSteps / total),
    averageApplicationLevel: Math.round(totalAppLevel / total),
  };
}
