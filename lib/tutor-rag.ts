/**
 * P3 grounded tutor pipeline. Three tiers:
 *
 *   Tier 1 (shared, cacheable): KV cache -> (miss) vector search -> Gemini JSON.
 *           Prompt contains ZERO student data; cached values are profile-free.
 *   Tier 2 (deterministic, per request, zero AI): weak-concept addendum
 *           built by string template on top of Tier 1, hits AND misses.
 *   Tier 3 (personalized AI, uncached): only for weak concepts within the
 *           daily budget. Budget exhausted: Tier 1+2 served silently.
 *
 * Citations are never invented: the model cites source ids from the retrieved
 * set only, and anything outside that set is dropped.
 */

import { createHash, randomUUID } from "node:crypto";
import { db } from "@/db";
import {
  aiUsageEvents,
  aiMaterialInstanceChunks,
  aiMaterialInstanceSections,
  knowledgeObjects,
} from "@/db/schema";
import { inArray, and, eq } from "drizzle-orm";
import { z } from "zod";
import { vectorStore } from "@/lib/vector-store";
import { kvGet, kvPut } from "@/lib/kv-cache";
import { PromptExecutor, type SystemPrompt } from "@/lib/prompt-executor";
import {
  buildLearnerProfile,
  countDueFlashcardsForConcept,
  updateTutorSessionSummary,
  type LearnerProfile,
} from "@/lib/learner-profile";
import { recordLearningEvent } from "@/lib/learning-events";

const SIMILARITY_FLOOR = 0.5;
const CACHE_CONFIDENCE_FLOOR = 0.6;
const TUTOR_TTL_SECONDS = 7 * 24 * 3600;
const SUMMARY_TTL_SECONDS = 30 * 24 * 3600;
const TOP_K = 6;

// ─── Contracts ────────────────────────────────────────────────────────────────

export type TutorSourceType = "chapter" | "ko" | "question";

export interface TutorSource {
  type: TutorSourceType;
  id: string;
  label: string;
  /** Course-scoped link (not student-specific, safe to cache). */
  href: string;
}

/** Shared Tier 1 payload. This exact shape is cached in KV; never add student data. */
export interface TutorRagAnswer {
  answer: string;
  sources: TutorSource[];
  matchedConcepts: string[];
  confidence: number;
  grounded: boolean;
}

export interface TutorAddendum {
  conceptName: string;
  message: string;
  reviewHref: string;
  flashcardsDue: number;
  masteryScore: number;
}

export interface TutorRagResult extends TutorRagAnswer {
  cached: boolean;
  addendum: TutorAddendum | null;
  /** Tier 3 guidance, present only for weak concepts within budget. */
  personalized: string | null;
  budgetExhausted: boolean;
}

export interface ChapterSummary {
  keyConcepts: string[];
  commonMistakes: string[];
  importantFormulas: string[];
  practiceRecommendations: string[];
}

// ─── Cache keys ───────────────────────────────────────────────────────────────

export function normalizeQuestion(question: string): string {
  return question
    .trim()
    .toLowerCase()
    .replace(/[\p{P}\p{S}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tutorCacheKey(courseId: string, chapterId: string | null, question: string): string {
  const hash = createHash("sha256").update(normalizeQuestion(question)).digest("hex");
  return `tutor:${courseId}:${chapterId ?? "all"}:${hash}`;
}

async function logCacheHit(userId: string, feature: string): Promise<void> {
  try {
    await db.insert(aiUsageEvents).values({
      id: randomUUID(),
      userId,
      feature,
      model: "kv-cache",
      tokens: 0,
      requestType: "cache:hit",
    });
  } catch {
    // observability only, never block the answer
  }
}

// ─── Prompts (Tier 1 is strictly profile-free) ───────────────────────────────

interface GroundedVars {
  question: string;
  contextBlock: string;
  sourceList: string;
}

const tutorGroundedAnswer: SystemPrompt<GroundedVars> = {
  version: "tutor_rag/grounded_answer/v1.0.0",
  systemInstruction:
    "You are a precise university tutor. The excerpts were retrieved by similarity and may be irrelevant. First decide if they actually address the question. If they do, answer ONLY from them and cite sources strictly by the ids in the source list. If they do not (the question is off-topic for this course), set covered=false, give a brief general answer, and cite nothing. Never invent citations. Use markdown with LaTeX ($ inline, $$ display) for math, escaping backslashes for valid JSON. Answer in the same language as the question.",
  userPrompt: (vars) => `QUESTION: ${vars.question}

COURSE MATERIAL EXCERPTS:
${vars.contextBlock}

AVAILABLE SOURCES (cite only these ids):
${vars.sourceList}

Generate a single JSON object:
{
  "covered": [true only if the excerpts actually address this question, else false],
  "answer": "[Markdown answer. If covered, grounded in the excerpts; if not covered, a brief general explanation]",
  "sourceIds": ["[ids you actually used; empty array when covered is false]"],
  "matchedConcepts": ["[concept names this question is about]"],
  "confidence": [0.0 to 1.0, how well the excerpts cover the question]
}`,
};

interface UngroundedVars {
  question: string;
}

const tutorUngroundedAnswer: SystemPrompt<UngroundedVars> = {
  version: "tutor_rag/ungrounded_answer/v1.0.0",
  systemInstruction:
    "You are a careful university tutor. The student's question is not covered by their course materials. Give a short, correct general explanation. Never fabricate citations or pretend to reference course content. Answer in the same language as the question.",
  userPrompt: (vars) => `QUESTION: ${vars.question}

Generate a single JSON object:
{
  "answer": "[Short general markdown explanation]",
  "matchedConcepts": ["[general concept names this question is about]"],
  "confidence": [0.0 to 1.0]
}`,
};

interface PersonalVars {
  question: string;
  baseAnswer: string;
  conceptName: string;
  masteryScore: number;
  recentStruggles: string[];
  recentTutorTopics: string[];
}

const tutorPersonalGuidance: SystemPrompt<PersonalVars> = {
  version: "tutor_rag/personal_guidance/v1.0.0",
  systemInstruction:
    "You are a patient tutor adapting an explanation for a student who is weak on this concept. Use smaller steps, check one prerequisite, and address their recent mistake pattern. Keep it short (max 5 sentences). Same language as the question.",
  userPrompt: (vars) => `QUESTION: ${vars.question}
BASE ANSWER ALREADY SHOWN: ${vars.baseAnswer}
WEAK CONCEPT: ${vars.conceptName} (mastery ${vars.masteryScore}/100)
RECENT STRUGGLES: ${vars.recentStruggles.join(", ") || "none recorded"}
RECENT TUTOR TOPICS: ${vars.recentTutorTopics.join(", ") || "none"}

Generate a single JSON object:
{
  "guidance": "[Short markdown addendum: smaller steps, one prerequisite check, address the mistake pattern]"
}`,
};

const GroundedSchema = z.object({
  covered: z.boolean().default(true),
  answer: z.string(),
  sourceIds: z.array(z.string()).default([]),
  matchedConcepts: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0),
});

const UngroundedSchema = z.object({
  answer: z.string(),
  matchedConcepts: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0),
});

const PersonalSchema = z.object({ guidance: z.string() });

// ─── Retrieval + hydration ────────────────────────────────────────────────────

interface RetrievedSource extends TutorSource {
  content: string;
}

/**
 * Queries the course namespace and hydrates matches from the DB.
 * KO vectors carry conceptId/chapterId metadata; chunk vectors carry chunk_id.
 * Chapter filtering is native for KO vectors only (chunks have no chapter metadata).
 */
async function retrieve(
  courseId: string,
  chapterId: string | null,
  question: string
): Promise<RetrievedSource[]> {
  const matches = await vectorStore.query(courseId, question, {
    topK: TOP_K,
    ...(chapterId ? { filter: { chapterId } } : {}),
  });

  const relevant = matches.filter((m) => m.score >= SIMILARITY_FLOOR);
  if (relevant.length === 0) return [];

  const chunkIds: string[] = [];
  const koIds: string[] = [];
  for (const m of relevant) {
    if (typeof m.metadata.chunk_id === "string" && m.metadata.chunk_id) {
      chunkIds.push(m.metadata.chunk_id as string);
    } else {
      koIds.push(m.id);
    }
  }

  const [chunkRows, koRows] = await Promise.all([
    chunkIds.length > 0
      ? db
          .select({
            id: aiMaterialInstanceChunks.id,
            chunkText: aiMaterialInstanceChunks.chunkText,
            sectionTitle: aiMaterialInstanceSections.title,
            materialInstanceId: aiMaterialInstanceSections.materialInstanceId,
          })
          .from(aiMaterialInstanceChunks)
          .innerJoin(
            aiMaterialInstanceSections,
            eq(aiMaterialInstanceChunks.sectionId, aiMaterialInstanceSections.id)
          )
          .where(inArray(aiMaterialInstanceChunks.id, chunkIds))
      : Promise.resolve([]),
    koIds.length > 0
      ? db
          .select()
          .from(knowledgeObjects)
          .where(and(inArray(knowledgeObjects.id, koIds), eq(knowledgeObjects.status, "active")))
      : Promise.resolve([]),
  ]);

  const sources: RetrievedSource[] = [];
  for (const c of chunkRows) {
    sources.push({
      type: "chapter",
      id: c.materialInstanceId,
      label: c.sectionTitle || "Materi",
      href: `/courses/${courseId}/material/${c.materialInstanceId}`,
      content: c.chunkText,
    });
  }
  for (const ko of koRows) {
    sources.push({
      type: "ko",
      id: ko.id,
      label: ko.title,
      href: `/courses/${courseId}/material`,
      content: `${ko.conceptName}: ${ko.content}`,
    });
  }
  return sources;
}

// ─── Tier 2 + Tier 3 (per student, never cached) ─────────────────────────────

function intersectWeak(matchedConcepts: string[], profile: LearnerProfile) {
  const norm = (s: string) => s.trim().toLowerCase();
  // The model often echoes elaborated labels ("Aturan rantai (chain rule)")
  // rather than the exact DB conceptName, so match on containment either way.
  for (const matched of matchedConcepts) {
    const b = norm(matched);
    const weak = profile.weakConcepts.find((w) => {
      const a = norm(w.conceptName);
      const shorter = Math.min(a.length, b.length);
      return shorter >= 4 && (a === b || a.includes(b) || b.includes(a));
    });
    if (weak) return weak;
  }
  return null;
}

async function buildAddendum(
  studentId: string,
  courseId: string,
  answer: TutorRagAnswer,
  profile: LearnerProfile
): Promise<TutorAddendum | null> {
  const weak = intersectWeak(answer.matchedConcepts, profile);
  if (!weak) return null;

  const flashcardsDue = await countDueFlashcardsForConcept(
    studentId,
    courseId,
    weak.conceptName
  );

  return {
    conceptName: weak.conceptName,
    masteryScore: weak.masteryScore,
    message: `You scored ${weak.masteryScore} here recently.`,
    reviewHref: `/courses/${courseId}/material`,
    flashcardsDue,
  };
}

// ─── Main pipeline ────────────────────────────────────────────────────────────

export interface AskTutorParams {
  studentId: string;
  courseId: string;
  chapterId?: string | null;
  question: string;
}

export async function askTutorRag(params: AskTutorParams): Promise<TutorRagResult> {
  const { studentId, courseId, question } = params;
  const chapterId = params.chapterId ?? null;
  const cacheKey = tutorCacheKey(courseId, chapterId, question);

  const profile = await buildLearnerProfile(studentId, courseId);

  // Tier 1: cache
  let base = await kvGet<TutorRagAnswer>(cacheKey);
  let cached = false;
  let budgetExhausted = false;

  if (base && typeof base.answer === "string") {
    cached = true;
    await logCacheHit(studentId, "tutor_rag");
  } else {
    base = null;
    const retrieved = await retrieve(courseId, chapterId, question);

    if (retrieved.length === 0) {
      const result = await PromptExecutor.run({
        userId: studentId,
        prompt: tutorUngroundedAnswer,
        variables: { question },
        schema: UngroundedSchema,
      });
      if (result.success && result.data) {
        base = {
          answer: result.data.answer,
          sources: [],
          matchedConcepts: result.data.matchedConcepts,
          confidence: result.data.confidence,
          grounded: false,
        };
      } else if (result.errors[0]?.includes("DAILY_QUOTA_EXCEEDED")) {
        budgetExhausted = true;
      } else {
        console.error("tutor ungrounded generation failed:", result.errors[0]);
        budgetExhausted = true;
      }
    } else {
      const contextBlock = retrieved
        .map((s, i) => `[${i + 1}] (source id: ${s.id})\n${s.content}`)
        .join("\n\n");
      const sourceList = retrieved.map((s) => `${s.id} | ${s.type} | ${s.label}`).join("\n");

      const result = await PromptExecutor.run({
        userId: studentId,
        prompt: tutorGroundedAnswer,
        variables: { question, contextBlock, sourceList },
        schema: GroundedSchema,
      });

      if (result.success && result.data) {
        const d = result.data;
        if (d.covered) {
          // Never invent citations: keep only ids that were actually retrieved
          const byId = new Map(retrieved.map((s) => [s.id, s]));
          const citedIds = d.sourceIds.filter((id) => byId.has(id));
          const sourceIds = citedIds.length > 0 ? citedIds : retrieved.slice(0, 3).map((s) => s.id);
          const sources = [...new Set(sourceIds)].map((id) => {
            const s = byId.get(id)!;
            return { type: s.type, id: s.id, label: s.label, href: s.href };
          });
          base = {
            answer: d.answer,
            sources,
            matchedConcepts: d.matchedConcepts,
            confidence: d.confidence,
            grounded: true,
          };
        } else {
          // Retrieved excerpts do not actually cover the question: honest, uncited.
          base = {
            answer: d.answer,
            sources: [],
            matchedConcepts: d.matchedConcepts,
            confidence: d.confidence,
            grounded: false,
          };
        }

        if (base.confidence >= CACHE_CONFIDENCE_FLOOR) {
          await kvPut(cacheKey, base, TUTOR_TTL_SECONDS);
        }
      } else if (result.errors[0]?.includes("DAILY_QUOTA_EXCEEDED")) {
        budgetExhausted = true;
      } else {
        console.error("tutor grounded generation failed:", result.errors[0]);
        budgetExhausted = true;
      }
    }
  }

  if (!base) {
    return {
      answer: "",
      sources: [],
      matchedConcepts: [],
      confidence: 0,
      grounded: false,
      cached: false,
      addendum: null,
      personalized: null,
      budgetExhausted: true,
    };
  }

  // Tier 2: deterministic addendum, runs on hits AND misses
  const addendum = await buildAddendum(studentId, courseId, base, profile);

  // Tier 3: personalized AI, only for weak concepts, charged, silent on exhaustion
  let personalized: string | null = null;
  if (addendum) {
    const result = await PromptExecutor.run({
      userId: studentId,
      prompt: tutorPersonalGuidance,
      variables: {
        question,
        baseAnswer: base.answer,
        conceptName: addendum.conceptName,
        masteryScore: addendum.masteryScore,
        recentStruggles: profile.recentStruggles,
        recentTutorTopics: profile.recentTutorTopics,
      },
      schema: PersonalSchema,
    });
    if (result.success && result.data) {
      personalized = result.data.guidance;
    }
    // quota exceeded or failure: serve Tier 1+2 silently
  }

  // Session memory + learning event (deterministic)
  if (base.matchedConcepts.length > 0) {
    await updateTutorSessionSummary(studentId, courseId, base.matchedConcepts);
  }
  await recordLearningEvent({
    studentId,
    courseId,
    eventType: "tutor_question",
    conceptName: base.matchedConcepts[0] ?? null,
  });

  return { ...base, cached, addendum, personalized, budgetExhausted };
}

// ─── Chapter summary (cache-first, profile-free by design) ───────────────────

interface SummaryVars {
  chapterTitle: string;
  koBlock: string;
}

const chapterSummaryPrompt: SystemPrompt<SummaryVars> = {
  version: "tutor_rag/chapter_summary/v1.0.0",
  systemInstruction:
    "You summarize a course chapter from its knowledge objects. Be concise and factual; use the same language as the source content. Formulas in LaTeX.",
  userPrompt: (vars) => `CHAPTER: ${vars.chapterTitle}

KNOWLEDGE OBJECTS:
${vars.koBlock}

Generate a single JSON object:
{
  "keyConcepts": ["[3 to 6 key concepts, one line each]"],
  "commonMistakes": ["[2 to 4 common student mistakes]"],
  "importantFormulas": ["[important formulas in LaTeX, empty array if none]"],
  "practiceRecommendations": ["[2 to 3 concrete practice recommendations]"]
}`,
};

const SummarySchema = z.object({
  keyConcepts: z.array(z.string()).default([]),
  commonMistakes: z.array(z.string()).default([]),
  importantFormulas: z.array(z.string()).default([]),
  practiceRecommendations: z.array(z.string()).default([]),
});

export interface SummarizeChapterResult {
  summary: ChapterSummary;
  cached: boolean;
  budgetExhausted: boolean;
}

export async function summarizeChapterCached(
  userId: string,
  chapterId: string,
  chapterTitle: string
): Promise<SummarizeChapterResult> {
  const kos = await db
    .select()
    .from(knowledgeObjects)
    .where(and(eq(knowledgeObjects.chapterId, chapterId), eq(knowledgeObjects.status, "active")));

  if (kos.length === 0) {
    return {
      summary: { keyConcepts: [], commonMistakes: [], importantFormulas: [], practiceRecommendations: [] },
      cached: false,
      budgetExhausted: false,
    };
  }

  // Material version: newest KO edit. Key embeds it, so edits invalidate naturally.
  const version = Math.max(...kos.map((k) => k.updatedAt.getTime()));
  const cacheKey = `summary:${chapterId}:${version}`;

  const hit = await kvGet<ChapterSummary>(cacheKey);
  if (hit && Array.isArray(hit.keyConcepts)) {
    await logCacheHit(userId, "tutor_summary");
    return { summary: hit, cached: true, budgetExhausted: false };
  }

  const koBlock = kos
    .map((k) => `- [${k.type}] ${k.title}: ${k.content}`)
    .join("\n")
    .slice(0, 24000);

  const result = await PromptExecutor.run({
    userId,
    prompt: chapterSummaryPrompt,
    variables: { chapterTitle, koBlock },
    schema: SummarySchema,
  });

  if (!result.success || !result.data) {
    console.error("chapter summary generation failed:", result.errors[0]);
    return {
      summary: { keyConcepts: [], commonMistakes: [], importantFormulas: [], practiceRecommendations: [] },
      cached: false,
      budgetExhausted: true,
    };
  }

  await kvPut(cacheKey, result.data, SUMMARY_TTL_SECONDS);
  return { summary: result.data, cached: false, budgetExhausted: false };
}
