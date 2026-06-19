export interface MasterySummary {
  overallMastery: number; // 0 - 100
  overallConfidence: number; // 0 - 1
  evidenceCount: number;
  lastEvidenceAt: Date | null;
}

export interface WeakConceptSummary {
  conceptName: string;
  masteryScore: number;
  confidence: number;
  evidenceCount: number;
  trend: "improving" | "stable" | "declining";
}

export interface ChapterMasterySummary {
  chapterId: string;
  title: string;
  orderIndex: number;
  masteryScore: number;
  confidence: number;
  evidenceCount: number;
  trend: "improving" | "stable" | "declining";
  lastEvidenceAt: Date | null;
}
