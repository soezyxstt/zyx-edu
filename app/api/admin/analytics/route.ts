/**
 * GET /api/admin/analytics
 *
 * Returns aggregate metrics for admin monitoring:
 * - Question bank stats (total, by status, avg quality)
 * - Generation job stats (total tokens used, success rate)
 * - Attempt stats (total, avg score, completion rate)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { aiQuestionBank, aiGenerationJobs, studentQuizAttempts } from '@/db/schema';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { sql, eq, and } from 'drizzle-orm';

export async function GET(_req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [questionStats, jobStats, attemptStats] = await Promise.all([
    // Question bank breakdown by review_status
    db
      .select({
        reviewStatus: aiQuestionBank.reviewStatus,
        count: sql<number>`count(*)::int`,
        avgQuality: sql<number>`avg(${aiQuestionBank.qualityScore})::numeric(4,3)`,
        totalUseCount: sql<number>`sum(${aiQuestionBank.useCount})::int`,
      })
      .from(aiQuestionBank)
      .groupBy(aiQuestionBank.reviewStatus),

    // Generation job stats
    db
      .select({
        status: aiGenerationJobs.status,
        count: sql<number>`count(*)::int`,
        totalTokens: sql<number>`sum(${aiGenerationJobs.tokenUsage})::int`,
        totalGenerated: sql<number>`sum(${aiGenerationJobs.generatedCount})::int`,
      })
      .from(aiGenerationJobs)
      .groupBy(aiGenerationJobs.status),

    // Attempt stats
    db
      .select({
        status: studentQuizAttempts.status,
        count: sql<number>`count(*)::int`,
        avgScore: sql<number>`avg(${studentQuizAttempts.score})::numeric(5,2)`,
      })
      .from(studentQuizAttempts)
      .groupBy(studentQuizAttempts.status),
  ]);

  return NextResponse.json({
    questionBank: questionStats,
    generationJobs: jobStats,
    quizAttempts: attemptStats,
    generatedAt: new Date().toISOString(),
  });
}
