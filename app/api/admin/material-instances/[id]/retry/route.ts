import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { aiMaterialInstances, aiMaterialInstanceChunks } from '@/db/schema';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { upsertChunkVector } from '@/lib/pinecone';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Load the instance
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

  // Find chunks that are NOT synced yet
  const unsyncedChunks: {
    id: string;
    sectionId: string;
    chunkText: string;
    orderIndex: number;
    pineconeVectorId: string;
    isSynced: boolean;
    createdAt: Date;
    sectionTitle: string | null;
  }[] = [];

  for (const s of instance.sections) {
    for (const c of s.chunks) {
      if (!c.isSynced) {
        unsyncedChunks.push({
          ...c,
          sectionTitle: s.title,
        });
      }
    }
  }

  if (unsyncedChunks.length === 0) {
    // Already synced!
    await db
      .update(aiMaterialInstances)
      .set({ pineconeSyncStatus: 'synced', lastSyncError: null })
      .where(eq(aiMaterialInstances.id, id));
    return NextResponse.json({ success: true, message: 'All chunks are already synced.' });
  }

  // Update instance status to pending
  await db
    .update(aiMaterialInstances)
    .set({ pineconeSyncStatus: 'pending', lastSyncError: null })
    .where(eq(aiMaterialInstances.id, id));

  // Extract keywords if stored as JSONB array
  const keywords = Array.isArray(instance.keywords) ? (instance.keywords as string[]) : [];

  const vectorUpserts: Promise<void>[] = [];

  for (const chunk of unsyncedChunks) {
    const upsertPromise = (async () => {
      try {
        await upsertChunkVector(chunk.pineconeVectorId, chunk.chunkText, {
          course_id: instance.courseId,
          material_instance_id: instance.id,
          section_id: chunk.sectionId,
          chunk_id: chunk.id,
          chapter_name: chunk.sectionTitle ?? instance.title,
          keywords,
          difficulty_target: 'medium',
        });

        // Mark as synced in Postgres
        await db
          .update(aiMaterialInstanceChunks)
          .set({ isSynced: true })
          .where(eq(aiMaterialInstanceChunks.id, chunk.id));
      } catch (error) {
        console.error(`Gagal melakukan sinkronisasi ulang chunk ${chunk.id}:`, error);
        throw error;
      }
    })();
    vectorUpserts.push(upsertPromise);
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
      errorMsg = `Gagal sinkronisasi ${failed.length} chunk pada retry. Detail Error: ${uniqueErrors.join('; ')}`;
    }

    await db
      .update(aiMaterialInstances)
      .set({
        pineconeSyncStatus: status,
        lastSyncError: errorMsg,
      })
      .where(eq(aiMaterialInstances.id, id));
  }).catch(console.error);

  return NextResponse.json({
    success: true,
    message: `Started syncing ${unsyncedChunks.length} chunks in the background.`,
  });
}
