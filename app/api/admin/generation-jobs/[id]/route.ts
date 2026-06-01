/**
 * GET /api/admin/generation-jobs/[id]
 * Returns a single generation job with its logs and error details.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { aiGenerationJobs } from '@/db/schema';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'teacher')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const [job] = await db
    .select()
    .from(aiGenerationJobs)
    .where(eq(aiGenerationJobs.id, id))
    .limit(1);

  if (!job) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(job);
}
