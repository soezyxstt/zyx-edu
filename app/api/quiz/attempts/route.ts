/**
 * POST /api/quiz/attempts  — Start a new quiz attempt from a template
 * GET  /api/quiz/attempts  — List this student's completed attempts
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { db } from '@/db';
import { quizTemplates, aiQuestionBank, studentQuizAttempts } from '@/db/schema';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { and, eq, asc, inArray, sql, desc } from 'drizzle-orm';

const StartSchema = z.object({
  templateId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = StartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { templateId } = parsed.data;
  const studentId = session.user.id;

  const [template] = await db
    .select()
    .from(quizTemplates)
    .where(eq(quizTemplates.id, templateId))
    .limit(1);

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  // Enforce max attempts
  if (template.maxAttempts !== null) {
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(studentQuizAttempts)
      .where(
        and(
          eq(studentQuizAttempts.studentId, studentId),
          eq(studentQuizAttempts.templateId, templateId),
          eq(studentQuizAttempts.status, 'completed'),
        ),
      );
    if (total >= template.maxAttempts) {
      return NextResponse.json({ error: 'Max attempts reached' }, { status: 409 });
    }
  }

  const rules = template.selectionRules as Record<string, unknown>;
  const totalCount = Number(rules.count ?? 10);
  const proportions = (rules.difficulty_proportions as Record<string, number> | undefined) ?? {
    easy: Math.round(totalCount * 0.3),
    medium: Math.round(totalCount * 0.5),
    hard: totalCount - Math.round(totalCount * 0.3) - Math.round(totalCount * 0.5),
  };

  // Build question set from bank using difficulty proportions
  const questionsByDifficulty = await Promise.all(
    Object.entries(proportions).map(([diff, count]) =>
      db
        .select()
        .from(aiQuestionBank)
        .where(
          and(
            eq(aiQuestionBank.courseId, template.courseId),
            eq(aiQuestionBank.reviewStatus, 'published'),
            eq(aiQuestionBank.difficulty, diff as 'easy' | 'medium' | 'hard'),
          ),
        )
        .orderBy(asc(aiQuestionBank.useCount))
        .limit(count),
    ),
  );

  const selected = questionsByDifficulty.flat().sort(() => Math.random() - 0.5);

  if (selected.length === 0) {
    return NextResponse.json(
      { error: 'No published questions available for this template' },
      { status: 422 },
    );
  }

  // Build deep snapshot (includes answers — stored server-side only)
  const snapshot = selected.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: q.options,
    correct_indices: q.correctIndices,
    explanation: q.explanation,
    difficulty: q.difficulty,
  }));

  const attemptId = randomUUID();
  await db.insert(studentQuizAttempts).values({
    id: attemptId,
    studentId,
    templateId,
    status: 'in_progress',
    questionsSnapshot: snapshot as unknown as Record<string, unknown>,
    answersSnapshot: null,
  });

  // Return questions WITHOUT correct_indices to the client
  const clientQuestions = selected.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: q.options,
    difficulty: q.difficulty,
    tags: q.tags,
  }));

  return NextResponse.json(
    {
      attemptId,
      templateId,
      timeLimitSeconds: template.timeLimitSeconds,
      questions: clientQuestions,
    },
    { status: 201 },
  );
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const templateId = searchParams.get('templateId');

  const conditions = [eq(studentQuizAttempts.studentId, session.user.id)];
  if (templateId) conditions.push(eq(studentQuizAttempts.templateId, templateId));

  const attempts = await db
    .select()
    .from(studentQuizAttempts)
    .where(and(...conditions))
    .orderBy(desc(studentQuizAttempts.startedAt))
    .limit(50);

  return NextResponse.json(attempts);
}
