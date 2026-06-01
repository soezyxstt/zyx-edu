/**
 * POST /api/quiz/attempts/[id]/submit  — Submit answers and grade the attempt
 * GET  /api/quiz/attempts/[id]         — Get attempt details (student's own)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { studentQuizAttempts, aiQuestionBank } from '@/db/schema';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { and, eq, inArray, sql } from 'drizzle-orm';

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Context) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const [attempt] = await db
    .select()
    .from(studentQuizAttempts)
    .where(
      and(
        eq(studentQuizAttempts.id, id),
        eq(studentQuizAttempts.studentId, session.user.id),
      ),
    )
    .limit(1);

  if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(attempt);
}

const SubmitSchema = z.object({
  answers: z.record(z.string(), z.array(z.number())),
  durationSeconds: z.number().int().min(0).optional(),
});

export async function POST(req: NextRequest, { params }: Context) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const url = new URL(req.url);
  const isSubmit = url.pathname.endsWith('/submit') || true; // this route handles submission

  const [attempt] = await db
    .select()
    .from(studentQuizAttempts)
    .where(
      and(
        eq(studentQuizAttempts.id, id),
        eq(studentQuizAttempts.studentId, session.user.id),
        eq(studentQuizAttempts.status, 'in_progress'),
      ),
    )
    .limit(1);

  if (!attempt) {
    return NextResponse.json({ error: 'Attempt not found or already submitted' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = SubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { answers, durationSeconds } = parsed.data;
  const snapshot = attempt.questionsSnapshot as Array<{
    id: string;
    correct_indices: number[];
  }>;

  // Auto-grade
  let correct = 0;
  for (const q of snapshot) {
    const submitted = answers[q.id] ?? [];
    const isCorrect =
      submitted.length === q.correct_indices.length &&
      submitted.every((i) => q.correct_indices.includes(i));
    if (isCorrect) correct++;
  }

  const score = snapshot.length > 0 ? Math.round((correct / snapshot.length) * 100) : 0;

  await db
    .update(studentQuizAttempts)
    .set({
      status: 'completed',
      score,
      durationSeconds: durationSeconds ?? null,
      answersSnapshot: answers as unknown as Record<string, unknown>,
      submittedAt: new Date(),
    })
    .where(eq(studentQuizAttempts.id, id));

  // Increment use counts
  const questionIds = snapshot.map((q) => q.id);
  if (questionIds.length > 0) {
    await db
      .update(aiQuestionBank)
      .set({ useCount: sql`${aiQuestionBank.useCount} + 1` })
      .where(inArray(aiQuestionBank.id, questionIds));
  }

  return NextResponse.json({ score, correct, total: snapshot.length });
}
