/**
 * POST /api/admin/material-instances
 * Parses raw material text into sections/chunks, saves to DB, and syncs to Pinecone.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import {
  aiMaterialInstances,
  aiMaterialInstanceSections,
  aiMaterialInstanceChunks,
} from '@/db/schema';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { parseMaterialIntoSections } from '@/lib/ingestion-parser';
import { upsertChunkVector } from '@/lib/pinecone';

const BodySchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1).max(255),
  sourceType: z.enum(['markdown', 'json', 'pdf_extraction']),
  rawText: z.string().min(1),
  summary: z.string().min(1),
  learningObjectives: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { courseId, title, sourceType, rawText, summary, learningObjectives, keywords } =
    parsed.data;

  const instanceId = randomUUID();

  // Parse text into sections → chunks
  const sections = parseMaterialIntoSections(rawText);

  // Save instance (defaults pineconeSyncStatus to 'pending')
  await db.insert(aiMaterialInstances).values({
    id: instanceId,
    courseId,
    title,
    sourceType,
    summary,
    learningObjectives: learningObjectives as unknown as Record<string, unknown>,
    keywords: keywords as unknown as Record<string, unknown>,
    pineconeSyncStatus: 'pending',
    lastSyncError: null,
  });

  const vectorUpserts: Promise<void>[] = [];

  for (const section of sections) {
    const sectionId = randomUUID();

    await db.insert(aiMaterialInstanceSections).values({
      id: sectionId,
      materialInstanceId: instanceId,
      title: section.title,
      orderIndex: section.orderIndex,
    });

    for (const chunk of section.chunks) {
      const chunkId = randomUUID();
      const vectorId = `chunk_${chunkId}`;

      await db.insert(aiMaterialInstanceChunks).values({
        id: chunkId,
        sectionId,
        chunkText: chunk.chunkText,
        orderIndex: chunk.orderIndex,
        pineconeVectorId: vectorId,
        isSynced: false,
      });

      // Queue Pinecone upsert with inline status tracking
      const upsertPromise = (async () => {
        try {
          await upsertChunkVector(vectorId, chunk.chunkText, {
            course_id: courseId,
            material_instance_id: instanceId,
            section_id: sectionId,
            chunk_id: chunkId,
            chapter_name: section.title ?? title,
            keywords,
            difficulty_target: 'medium',
          });
          // Update specific chunk status
          await db
            .update(aiMaterialInstanceChunks)
            .set({ isSynced: true })
            .where(eq(aiMaterialInstanceChunks.id, chunkId));
        } catch (error) {
          console.error(`Gagal mengunggah chunk ${chunkId} ke Pinecone:`, error);
          throw error;
        }
      })();
      vectorUpserts.push(upsertPromise);
    }
  }

  // Fire vector upserts in background
  Promise.allSettled(vectorUpserts).then(async (results) => {
    const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    const status = failed.length === 0 ? 'synced' : 'failed';
    
    let errorMsg = null;
    if (failed.length > 0) {
      const uniqueErrors = Array.from(
        new Set(failed.map((f) => f.reason?.message || String(f.reason)))
      );
      errorMsg = `Gagal sinkronisasi ${failed.length} chunk. Detail Error: ${uniqueErrors.join('; ')}`;
    }

    await db
      .update(aiMaterialInstances)
      .set({
        pineconeSyncStatus: status,
        lastSyncError: errorMsg,
      })
      .where(eq(aiMaterialInstances.id, instanceId));
  }).catch(console.error);

  return NextResponse.json(
    {
      instanceId,
      sectionsCreated: sections.length,
      chunksCreated: sections.reduce((acc, s) => acc + s.chunks.length, 0),
    },
    { status: 201 },
  );
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing ID parameter' }, { status: 400 });
  }

  const instance = await db.query.aiMaterialInstances.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    with: {
      sections: {
        with: {
          chunks: true,
        },
      },
    },
  });

  if (!instance) {
    return NextResponse.json({ error: 'Material instance not found' }, { status: 404 });
  }

  const vectorIds = instance.sections.flatMap((s) => s.chunks.map((c) => c.pineconeVectorId));

  // Run Pinecone deletion asynchronously
  const courseId = instance.courseId;
  const deletePromise = (async () => {
    try {
      const { deleteSectionVectors } = await import('@/lib/pinecone');
      await deleteSectionVectors(courseId, vectorIds);
    } catch (err) {
      console.error('Failed to delete vectors from Pinecone:', err);
    }
  })();

  // Delete from Postgres (Cascade deletes sections and chunks)
  await db.delete(aiMaterialInstances).where(eq(aiMaterialInstances.id, id));

  // Await Pinecone deletion completion in background
  Promise.allSettled([deletePromise]).catch(console.error);

  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'teacher')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId');

  const instances = await db.query.aiMaterialInstances.findMany({
    where: courseId
      ? (t, { eq }) => eq(t.courseId, courseId)
      : undefined,
    with: { sections: { with: { chunks: true } } },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return NextResponse.json(instances);
}
