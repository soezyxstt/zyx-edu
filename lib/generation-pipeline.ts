/**
 * AI Question Generation Pipeline
 *
 * Workflow:
 *   Tutor Request → Create Job → Embed Query → Pinecone Search →
 *   Hydrate Text Chunks → Gemini Flash → Validate JSON Schema → Save Question Bank → Complete Job
 *
 * Runs asynchronously; the HTTP handler returns the job ID immediately.
 * The pipeline updates ai_generation_jobs status as it progresses.
 */

import { randomUUID } from 'crypto';
import { db } from '@/db';
import {
  aiGenerationJobs,
  aiQuestionBank,
  aiMaterialInstanceChunks,
} from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { ai, withGeminiRetry } from '@/lib/gemini';
import { queryChunks } from '@/lib/pinecone';
import { z } from 'zod';

// ─── Gemini structured output schema ─────────────────────────────────────────

const QuestionSchema = z.object({
  prompt: z.string().min(10),
  options: z.array(z.string()).length(5),
  correct_indices: z.array(z.number().int().min(0).max(4)).min(1),
  explanation: z.string().min(10),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  tags: z.array(z.string()),
});

const GenerationOutputSchema = z.object({
  questions: z.array(QuestionSchema),
});

type ValidatedQuestion = z.infer<typeof QuestionSchema>;

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildGenerationPrompt(
  contextChunks: string[],
  topic: string,
  targetCount: number,
  difficulty: string,
): string {
  const contextBlock = contextChunks
    .map((c, i) => `[Chunk ${i + 1}]\n${c}`)
    .join('\n\n---\n\n');

  return `You are an expert educator creating high-quality multiple-choice assessment questions.

CONTEXT MATERIAL:
${contextBlock}

TASK:
Generate exactly ${targetCount} multiple-choice questions about the topic: "${topic}".
Target difficulty: ${difficulty}.

REQUIREMENTS:
- Each question must have exactly 5 answer options (A through E).
- correct_indices is an array of 0-based indices for the correct answer(s).
- explanation must clearly justify why the correct answer(s) are right.
- difficulty must be one of: easy, medium, hard.
- tags should be 1–4 relevant topic keywords.
- Base all questions strictly on the provided context material.
- MATHEMATICAL FORMATTING: If you include any math equations, variables, numbers with units, formulas, or expressions in questions, options, or explanations, you MUST use standard LaTeX:
  * Wrap inline math expressions, symbols, or variables in single dollar signs, like: $x$, $f(x) = x^2$, or $9.8 \\text{ m/s}^2$.
  * Wrap block math equations on their own lines in double dollar signs, like: $$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$$.
  * Do NOT use escaped parenthesis or brackets like \\( ... \\) or \\[ ... \\]. Use ONLY $ ... $ and $$ ... $$.

Respond ONLY with valid JSON matching this exact schema:
{
  "questions": [
    {
      "prompt": "string",
      "options": ["string", "string", "string", "string", "string"],
      "correct_indices": [number],
      "explanation": "string",
      "difficulty": "easy"|"medium"|"hard",
      "tags": ["string"]
    }
  ]
}`;
}

// ─── Pipeline execution ───────────────────────────────────────────────────────

export interface GenerationJobParams {
  courseId: string;
  tutorId: string;
  topic: string;
  targetCount: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  sectionId?: string;
}

/** Creates a job row and kicks off the background pipeline. Returns the job ID. */
export async function startGenerationJob(params: GenerationJobParams): Promise<string> {
  const jobId = randomUUID();
  const { courseId, tutorId, topic, targetCount, difficulty, sectionId } = params;

  await db.insert(aiGenerationJobs).values({
    id: jobId,
    tutorId,
    courseId,
    status: 'pending',
    promptParameters: { topic, difficulty, sectionId } as Record<string, unknown>,
    targetCount,
    generatedCount: 0,
    tokenUsage: 0,
  });

  // Fire-and-forget: don't await the pipeline
  runPipeline(jobId, params).catch(async (err) => {
    await db
      .update(aiGenerationJobs)
      .set({ status: 'failed', errorMessage: String(err), updatedAt: new Date() })
      .where(eq(aiGenerationJobs.id, jobId));
  });

  return jobId;
}

async function runPipeline(jobId: string, params: GenerationJobParams): Promise<void> {
  const { courseId, topic, targetCount, difficulty } = params;

  // Mark as processing
  await db
    .update(aiGenerationJobs)
    .set({ status: 'processing', updatedAt: new Date() })
    .where(eq(aiGenerationJobs.id, jobId));

  // Step 1: Retrieve relevant chunks via Pinecone
  const matches = await queryChunks(courseId, topic, 10);

  let contextChunks: string[] = [];

  if (matches.length > 0) {
    // Step 2: Hydrate chunk text from PostgreSQL
    const chunkIds = matches.map((m) => m.chunkId);
    const chunks = await db
      .select({ chunkText: aiMaterialInstanceChunks.chunkText, id: aiMaterialInstanceChunks.id })
      .from(aiMaterialInstanceChunks)
      .where(inArray(aiMaterialInstanceChunks.id, chunkIds));
    contextChunks = chunks.map((c) => c.chunkText);
  }

  // Fallback if Pinecone returned nothing — use a generic prompt without context
  const effectiveDifficulty = difficulty === 'mixed' ? 'medium' : difficulty;
  const prompt = buildGenerationPrompt(contextChunks, topic, targetCount, effectiveDifficulty);

  // Step 3: Call Gemini Flash with JSON output
  let rawOutput: string;
  let tokenUsage = 0;

  const response = await withGeminiRetry(() =>
    ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    }),
  );

  rawOutput = response.text ?? '';
  tokenUsage = response.usageMetadata?.totalTokenCount ?? 0;

  // Step 4: Validate JSON schema
  let parsed: { questions: ValidatedQuestion[] };
  try {
    const json = JSON.parse(rawOutput);
    parsed = GenerationOutputSchema.parse(json);
  } catch (e) {
    // Retry once with a cleaner prompt
    const retryResponse = await withGeminiRetry(() =>
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents:
          prompt + '\n\nIMPORTANT: Your previous response had invalid JSON. Respond ONLY with valid JSON, no markdown or code fences.',
        config: { responseMimeType: 'application/json' },
      }),
    );
    const retryRaw = retryResponse.text ?? '';
    tokenUsage += retryResponse.usageMetadata?.totalTokenCount ?? 0;
    const retryJson = JSON.parse(retryRaw);
    parsed = GenerationOutputSchema.parse(retryJson);
  }

  // Step 5: Save validated questions to question bank
  const sectionId = params.sectionId ?? null;

  await db.insert(aiQuestionBank).values(
    parsed.questions.map((q) => ({
      id: randomUUID(),
      courseId,
      sourceSectionId: sectionId,
      difficulty: q.difficulty,
      questionType: 'multiple_choice' as const,
      tags: q.tags as unknown as Record<string, unknown>,
      prompt: q.prompt,
      options: q.options as unknown as Record<string, unknown>,
      correctIndices: q.correct_indices as unknown as Record<string, unknown>,
      explanation: q.explanation,
      reviewStatus: 'generated' as const,
    })),
  );

  // Step 6: Mark job as completed
  await db
    .update(aiGenerationJobs)
    .set({
      status: 'completed',
      generatedCount: parsed.questions.length,
      tokenUsage,
      updatedAt: new Date(),
    })
    .where(eq(aiGenerationJobs.id, jobId));
}
