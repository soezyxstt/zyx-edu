import type { MasteryMemory, WeakConcept } from "./memory-layers";

export interface MasteryMemoryInput {
  studentId: string;
  courseId: string;
}

export interface MasteryProvider {
  getMasteryMemory(input: MasteryMemoryInput): Promise<MasteryMemory>;
}

export const DEFAULT_MASTERY_MEMORY: MasteryMemory = {
  strongestConcepts: [],
  weakestConcepts: [],
  chapterMastery: [],
  overallMasteryScore: 0,
};

export async function getMasteryMemory(input: MasteryMemoryInput): Promise<MasteryMemory> {
  return DEFAULT_MASTERY_MEMORY;
}

export function createMasteryMemory(
  strongest: WeakConcept[],
  weakest: WeakConcept[],
  chapterMastery: MasteryMemory["chapterMastery"],
  overallScore: number
): MasteryMemory {
  return {
    strongestConcepts: strongest,
    weakestConcepts: weakest,
    chapterMastery,
    overallMasteryScore: overallScore,
  };
}