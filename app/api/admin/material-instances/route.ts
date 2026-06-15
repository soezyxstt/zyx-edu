import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import {
  aiMaterialInstances,
  aiMaterialInstanceSections,
  aiMaterialInstanceChunks,
  masterTeachingDocuments,
  chapters,
  knowledgeObjects,
  websiteMaterials,
  concepts,
  conceptLocalizations,
} from '@/db/schema';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { parseMaterialIntoSections } from '@/lib/ingestion-parser';
import { upsertChunkVector } from '@/lib/pinecone';
import { extractKnowledgeObjectsForChapter } from '@/lib/ko-extractor';

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

  // Clean up any existing records for this course to prevent duplication
  await db.delete(chapters).where(eq(chapters.courseId, courseId));
  await db.delete(masterTeachingDocuments).where(eq(masterTeachingDocuments.courseId, courseId));
  await db.delete(aiMaterialInstances).where(eq(aiMaterialInstances.courseId, courseId));

  try {
    const { getNs } = await import('@/lib/pinecone');
    await getNs(courseId).deleteAll();
  } catch (err) {
    console.error('Failed to deleteAll vectors from Pinecone namespace:', err);
  }

  const instanceId = randomUUID();
  const mtdId = randomUUID();
  const chapterId = randomUUID(); // One single chapter ID for the entire uploaded document

  // Parse text into sections → chunks
  const sections = parseMaterialIntoSections(rawText);

  // Save legacy material instance (defaults pineconeSyncStatus to 'pending')
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

  // Save new domain: Master Teaching Document
  await db.insert(masterTeachingDocuments).values({
    id: mtdId,
    courseId,
    title,
    markdownContent: rawText,
    version: 1,
    status: 'active',
    createdById: session.user.id,
  });

  // Determine orderIndex for the single chapter based on title, fallback to 1
  let orderIndex = 1;
  const matchIndex = title.match(/Bab\s*(\d+)/i);
  if (matchIndex) {
    orderIndex = parseInt(matchIndex[1], 10);
  }

  // Create exactly ONE Chapter (initial status 'draft') for the entire uploaded document
  await db.insert(chapters).values({
    id: chapterId,
    courseId,
    title: title,
    orderIndex: orderIndex,
    status: 'draft',
  });

  // Create exactly ONE Website Material (initial status 'draft') for the entire chapter
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  await db.insert(websiteMaterials).values({
    id: randomUUID(),
    courseId,
    chapterId,
    sourceMtdId: mtdId,
    sourceMtdVersion: 1,
    isStale: false,
    generationHash: 'initial-hash',
    title: title,
    slug,
    canonicalMarkdown: rawText,
    structuredContent: [{ type: 'p', content: rawText }],
    status: 'draft',
  });

  const vectorUpserts: Promise<void>[] = [];
  const chapterExtractions: Promise<void>[] = [];

  for (const section of sections) {
    const sectionId = randomUUID();

    // 1. Insert Legacy Section
    await db.insert(aiMaterialInstanceSections).values({
      id: sectionId,
      materialInstanceId: instanceId,
      title: section.title,
      orderIndex: section.orderIndex,
    });

    const sectionContent = section.chunks.map((c) => c.chunkText).join('\n\n');

    // 2. Trigger KO extraction via Gemini (all linking to the same single chapterId!)
    const extractionPromise = (async () => {
      try {
        await extractKnowledgeObjectsForChapter(
          courseId,
          mtdId,
          chapterId,
          section.title || `Bagian ${section.orderIndex + 1}`,
          sectionContent
        );
      } catch (err) {
        console.error(`Failed to extract KOs for section ${section.title}:`, err);
        // Fallback: Register the concept and insert a single dummy concept_overview KO
        try {
          const fallbackConceptId = randomUUID();
          const conceptName = section.title || `Bagian ${section.orderIndex + 1}`;
          const fallbackSlug = conceptName
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-")
            .replace(/^-+|-+$/g, "");

          await db.transaction(async (tx) => {
            // Register concept
            await tx.insert(concepts).values({
              id: fallbackConceptId,
              canonicalSlug: `${fallbackSlug}-${fallbackConceptId.slice(0, 8)}`,
              isVerified: false,
            });

            // Register localization
            await tx.insert(conceptLocalizations).values({
              id: randomUUID(),
              conceptId: fallbackConceptId,
              lang: "id",
              displayName: conceptName,
              aliases: [],
              technicalStandardTerm: "id",
              embedding: null,
            });

            // Insert fallback KO
            await tx.insert(knowledgeObjects).values({
              id: randomUUID(),
              courseId,
              mtdId,
              chapterId,
              conceptId: fallbackConceptId,
              learningOrder: 1,
              title: `Konsep Utama: ${conceptName}`,
              conceptName: conceptName,
              content: sectionContent.slice(0, 800) || `Ringkasan materi untuk ${conceptName}`,
              type: 'concept_overview',
              difficulty: 'medium',
              bloomLevel: 'understand',
              tags: keywords && keywords.length > 0 ? keywords : ["fallback"],
              importance: 'high',
              status: 'active',
            });
          });
        } catch (fallbackErr) {
          console.error(`Double fault: Fallback insertion also failed for section ${section.title}:`, fallbackErr);
        }
      }
    })();
    chapterExtractions.push(extractionPromise);

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

  // Await the KO extractions to finish so the database is populated before returning
  await Promise.all(chapterExtractions);

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

      // Also clear Pinecone course namespace
      const { getNs } = await import('@/lib/pinecone');
      await getNs(courseId).deleteAll();
    } catch (err) {
      console.error('Failed to delete vectors from Pinecone:', err);
    }
  })();

  // Delete chapters and MTDs from Postgres to clear all derived/domain structures
  await db.delete(chapters).where(eq(chapters.courseId, courseId));
  await db.delete(masterTeachingDocuments).where(eq(masterTeachingDocuments.courseId, courseId));
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
