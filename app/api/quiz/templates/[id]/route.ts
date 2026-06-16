/**
 * DELETE /api/quiz/templates/[id] ; Delete a single quiz template
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quizTemplates } from '@/db/schema';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Context) {
 const session = await auth.api.getSession({ headers: await headers() });
 if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'teacher')) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 const { id } = await params;

 await db
 .delete(quizTemplates)
 .where(eq(quizTemplates.id, id));

 return NextResponse.json({ success: true });
}
