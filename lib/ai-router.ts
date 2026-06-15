export const USE_CASES = {
  // ── Tier A: Ultra High Volume (default: gemini-3.1-flash-lite) ─────────
  GROUNDED_RAG: 'grounded-rag',
  EXPLAIN_CONCEPT: 'explain-concept',
  CHAPTER_SUMMARY: 'chapter-summary',
  MISTAKE_FEEDBACK: 'mistake-feedback',
  FLASHCARD_GEN: 'flashcard-gen',
  MATERIAL_GEN: 'material-gen',
  PRACTICE_QUESTION_GEN: 'practice-question-gen',

  // ── Tier B: Medium Complexity (default: gemini-2.5-flash) ─────────────
  UNGROUNDED_TUTOR: 'ungrounded-tutor',
  UNGROUNDED_TUTOR_GEMMA: 'ungrounded-tutor-gemma',

  // ── Tier C: Premium Reasoning (default: gemini-3.5-flash) ─────────────
  KO_EXTRACTION: 'ko-extraction',
  KO_VALIDATION: 'ko-validation',
  QUESTION_REVIEW: 'question-review',
  WEAK_CONCEPT_GUIDANCE: 'weak-concept-guidance',
  WEAK_CONCEPT_GUIDANCE_GEMMA: 'weak-concept-guidance-gemma',

  // ── Diktat ────────────────────────────────────────────────────────────
  DIKTAT_AUDIT: 'diktat-audit',
  DIKTAT_PDF_AUDIT: 'diktat-pdf-audit',
  DIKTAT_EXAM_PATTERNS: 'diktat-exam-patterns',
  DIKTAT_QUICK_METHODS: 'diktat-quick-methods',

  // ── Embedding (separate path) ─────────────────────────────────────────
} as const;

export type UseCase = (typeof USE_CASES)[keyof typeof USE_CASES];

interface ModelChain {
  models: string[];
}

const CHAINS: Record<string, ModelChain> = {
  // Tier A: start cheap, escalate on exhaustion
  [USE_CASES.GROUNDED_RAG]: {
    models: ['gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-3.5-flash'],
  },
  [USE_CASES.EXPLAIN_CONCEPT]: {
    models: ['gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-3.5-flash'],
  },
  [USE_CASES.CHAPTER_SUMMARY]: {
    models: ['gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-3.5-flash'],
  },
  [USE_CASES.MISTAKE_FEEDBACK]: {
    models: ['gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-3.5-flash'],
  },
  [USE_CASES.FLASHCARD_GEN]: {
    models: ['gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-3.5-flash'],
  },
  [USE_CASES.MATERIAL_GEN]: {
    models: ['gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-3.5-flash'],
  },
  [USE_CASES.PRACTICE_QUESTION_GEN]: {
    models: ['gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-3.5-flash'],
  },

  // Tier B: start with 2.5-flash, escalate to 3.5
  [USE_CASES.UNGROUNDED_TUTOR]: {
    models: ['gemini-2.5-flash', 'gemini-3.5-flash'],
  },
  // Tier B Gemma fallback: when user's 5 premium/day exhausted
  [USE_CASES.UNGROUNDED_TUTOR_GEMMA]: {
    models: ['gemma-4-31b-it'],
  },

  // Tier C: premium reasoning
  [USE_CASES.KO_EXTRACTION]: {
    models: ['gemini-3.5-flash', 'gemini-2.5-flash'],
  },
  [USE_CASES.KO_VALIDATION]: {
    models: ['gemini-3.5-flash', 'gemini-2.5-flash'],
  },
  [USE_CASES.QUESTION_REVIEW]: {
    models: ['gemini-3.5-flash', 'gemini-2.5-flash'],
  },
  [USE_CASES.WEAK_CONCEPT_GUIDANCE]: {
    models: ['gemini-3.5-flash', 'gemini-2.5-flash'],
  },
  // Tier C Gemma fallback: when user's 5 premium/day exhausted
  [USE_CASES.WEAK_CONCEPT_GUIDANCE_GEMMA]: {
    models: ['gemma-4-31b-it'],
  },

  // Diktat
  [USE_CASES.DIKTAT_AUDIT]: {
    models: ['gemini-3.5-flash', 'gemini-2.5-flash'],
  },
  [USE_CASES.DIKTAT_PDF_AUDIT]: {
    models: ['gemini-3.5-flash', 'gemini-2.5-flash'],
  },
  [USE_CASES.DIKTAT_EXAM_PATTERNS]: {
    models: ['gemini-3.5-flash', 'gemini-2.5-flash'],
  },
  [USE_CASES.DIKTAT_QUICK_METHODS]: {
    models: ['gemini-3.5-flash', 'gemini-2.5-flash'],
  },

  default: {
    models: ['gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-3.5-flash'],
  },
};

export function getModelChain(useCase?: string): string[] {
  if (useCase && CHAINS[useCase]) {
    return CHAINS[useCase].models;
  }
  return CHAINS.default.models;
}

export const RPD_LIMITS: Record<string, number> = {
  'gemini-2.5-flash-lite': 50,
  'gemini-3.1-flash-lite': 500,
  'gemini-2.5-flash': 20,
  'gemini-3.5-flash': 20,
  'gemma-4-31b-it': 1500,
  'gemini-embedding-2': 1000,
  'gemini-embedding-002': 1000,
  'gemini-embedding-001': 1000,
};

export function getRpdLimit(modelId: string): number {
  return RPD_LIMITS[modelId] ?? 1500;
}
