/**
 * POST /api/admin/generation-jobs  — Create a new background generation job
 * GET  /api/admin/generation-jobs  — List jobs (filtered by courseId or status)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { aiGenerationJobs } from '@/db/schema';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { startGenerationJob } from '@/lib/generation-pipeline';
import { desc, eq } from 'drizzle-orm';

const CreateJobSchema = z.object({
  courseId: z.string().min(1),
  topic: z.string().min(1),
  targetCount: z.number().int().min(1).max(100),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).default('medium'),
  sectionId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'teacher')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = CreateJobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const jobId = await startGenerationJob({
    ...parsed.data,
    tutorId: session.user.id,
  });

  return NextResponse.json({ jobId }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'teacher')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId');
  const status = searchParams.get('status');

  const jobs = await db
    .select()
    .from(aiGenerationJobs)
    .where(
      courseId
        ? eq(aiGenerationJobs.courseId, courseId)
        : status
          ? eq(aiGenerationJobs.status, status as 'pending' | 'processing' | 'completed' | 'failed')
          : undefined,
    )
    .orderBy(desc(aiGenerationJobs.createdAt))
    .limit(50);

  return NextResponse.json(jobs);
}
