import { NextResponse } from 'next/server';
import { getAiStats } from '@/lib/ai/analytics';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

/**
 * GET /api/admin/ai-analytics
 * Returns AI request stats for the admin dashboard.
 * Admin-only — requires an active admin session.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const stats = getAiStats();
  return NextResponse.json(stats);
}
