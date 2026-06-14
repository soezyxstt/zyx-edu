/**
 * POST /api/quiz/attempts/[id]/submit  — Submit answers and grade the attempt
 * GET  /api/quiz/attempts/[id]         — Get attempt details (student's own)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { studentQuizAttempts, aiQuestionBank, quizTemplates, knowledgeObjects, attemptFeedback } from '@/db/schema';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { recordLearningEvents } from '@/lib/learning-events';
import { inngest } from '@/lib/inngest';
import { markRecommendationDone, buildPlanForConcepts } from '@/lib/recommendation-service';
import { env } from '@/lib/env';

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

  const feedbackRows = await db
    .select()
    .from(attemptFeedback)
    .where(eq(attemptFeedback.attemptId, id));

  return NextResponse.json({
    ...attempt,
    feedback: feedbackRows,
  });
}

const SubmitSchema = z.object({
  answers: z.record(z.string(), z.array(z.number())),
  durationSeconds: z.number().int().min(0).optional(),
});

export async function POST(req: NextRequest, { params }: Context) {
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

  // Increment use counts + collect KO data for learning events
  const questionIds = snapshot.map((q) => q.id);
  const questionKoMap: Map<string, { koId: string; conceptName: string | null }> = new Map();
  if (questionIds.length > 0) {
    const [, bankRows] = await Promise.all([
      db
        .update(aiQuestionBank)
        .set({ useCount: sql`${aiQuestionBank.useCount} + 1` })
        .where(inArray(aiQuestionBank.id, questionIds)),
      db
        .select({
          id: aiQuestionBank.id,
          koId: aiQuestionBank.knowledgeObjectId,
          conceptName: knowledgeObjects.conceptName,
        })
        .from(aiQuestionBank)
        .leftJoin(knowledgeObjects, eq(aiQuestionBank.knowledgeObjectId, knowledgeObjects.id))
        .where(inArray(aiQuestionBank.id, questionIds)),
    ]);
    for (const row of bankRows) {
      if (row.koId) {
        questionKoMap.set(row.id, { koId: row.koId, conceptName: row.conceptName ?? null });
      }
    }
  }

  // Group questions by conceptName and compute strong/weak areas
  const conceptResults: Record<string, { total: number; correct: number }> = {};
  for (const q of snapshot) {
    const ko = questionKoMap.get(q.id);
    if (!ko || !ko.conceptName) continue;
    const conceptName = ko.conceptName.trim();
    if (!conceptResults[conceptName]) {
      conceptResults[conceptName] = { total: 0, correct: 0 };
    }
    const submitted = answers[q.id] ?? [];
    const isCorrect =
      submitted.length === q.correct_indices.length &&
      submitted.every((i) => q.correct_indices.includes(i));
    conceptResults[conceptName].total++;
    if (isCorrect) conceptResults[conceptName].correct++;
  }

  const strongAreas: string[] = [];
  const weakAreas: string[] = [];
  for (const [conceptName, res] of Object.entries(conceptResults)) {
    if (res.correct === res.total) {
      strongAreas.push(conceptName);
    } else {
      weakAreas.push(conceptName);
    }
  }

  // Get courseId via template
  const [template] = await db
    .select({ courseId: quizTemplates.courseId })
    .from(quizTemplates)
    .where(eq(quizTemplates.id, attempt.templateId))
    .limit(1);

  const courseId = template?.courseId || "calc-1";

  // Build recommended next steps
  const nextSteps = weakAreas.length > 0
    ? await buildPlanForConcepts(attempt.studentId, courseId, weakAreas)
    : [];

  await db
    .update(studentQuizAttempts)
    .set({
      status: 'completed',
      score,
      durationSeconds: durationSeconds ?? null,
      answersSnapshot: answers as unknown as Record<string, unknown>,
      submittedAt: new Date(),
      strongAreas,
      weakAreas,
      recommendedNextSteps: nextSteps,
    })
    .where(eq(studentQuizAttempts.id, id));

  if (template) {
    const events = snapshot.map((q) => {
      const submitted = answers[q.id] ?? [];
      const isCorrect =
        submitted.length === q.correct_indices.length &&
        submitted.every((i) => q.correct_indices.includes(i));
      const ko = questionKoMap.get(q.id);
      return {
        studentId: attempt.studentId,
        courseId: template.courseId,
        eventType: 'quiz_answer' as const,
        koId: ko?.koId ?? null,
        conceptName: ko?.conceptName ?? null,
        correctness: isCorrect ? 1 : 0,
      };
    });

    await Promise.all([
      recordLearningEvents(events),
      inngest.send({ name: 'mastery/recompute.requested', data: { studentId: attempt.studentId, courseId: template.courseId } }),
    ]);
  }

  // Fire mistake feedback generation background event
  await inngest.send({
    name: 'quiz/feedback.requested',
    data: { attemptId: id }
  });

  // Auto-complete today's quiz recommendation when student passes
  if (env.FEATURE_TODAY === "1" && score >= 70) {
    markRecommendationDone(attempt.templateId, attempt.studentId).catch(() => {});
  }

  return NextResponse.json({ score, correct, total: snapshot.length });
}
