/**
 * POST /api/quiz/weekly-generate
 *
 * Cost-aware weekly quiz generation:
 * - If the bank has enough approved questions for the given criteria → create template directly
 * - If not enough → trigger Gemini generation pipeline first, then return job ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { db } from '@/db';
import { aiQuestionBank, quizTemplates } from '@/db/schema';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { and, eq, count } from 'drizzle-orm';
import { startGenerationJob } from '@/lib/generation-pipeline';

const Schema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1).max(255),
  topic: z.string().min(1),
  targetCount: z.number().int().min(1).max(100),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).default('medium'),
  timeLimitSeconds: z.number().int().min(60).optional(),
  tags: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'teacher')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { courseId, title, topic, targetCount, difficulty, timeLimitSeconds, tags } = parsed.data;

  // Check how many published questions exist for this course + difficulty
  const diffCondition =
    difficulty !== 'mixed' ? eq(aiQuestionBank.difficulty, difficulty) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(aiQuestionBank)
    .where(
      and(
        eq(aiQuestionBank.courseId, courseId),
        eq(aiQuestionBank.reviewStatus, 'published'),
        diffCondition,
      ),
    );

  if (total >= targetCount) {
    // Enough questions — create template directly (bypass Pinecone + Gemini)
    const templateId = randomUUID();
    await db.insert(quizTemplates).values({
      id: templateId,
      courseId,
      title,
      category: 'weekly',
      visibility: 'free',
      timeLimitSeconds: timeLimitSeconds ?? null,
      selectionRules: {
        topic,
        tags: tags ?? [],
        count: targetCount,
        difficulty_proportions:
          difficulty === 'mixed'
            ? {
                easy: Math.round(targetCount * 0.3),
                medium: Math.round(targetCount * 0.5),
                hard: Math.round(targetCount * 0.2),
              }
            : { [difficulty]: targetCount },
      } as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ mode: 'bank_reuse', templateId }, { status: 201 });
  }

  // Not enough — trigger generation pipeline first
  const jobId = await startGenerationJob({
    courseId,
    tutorId: session.user.id,
    topic,
    targetCount: targetCount * 2, // Generate 2N so tutor can curate N
    difficulty,
  });

  return NextResponse.json(
    {
      mode: 'generation_triggered',
      jobId,
      message: `Only ${total} approved questions found. Generating ${targetCount * 2} more via Gemini. Poll /api/admin/generation-jobs/${jobId} for status, then create template manually.`,
    },
    { status: 202 },
  );
}
