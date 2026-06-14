/**
 * Pinecone vector database client and chunk sync engine.
 *
 * Sync rules (from architecture doc):
 *   Create  → upsertChunkVector
 *   Update  → updateChunkVector (re-embeds and overwrites)
 *   Delete  → deleteChunkVector
 *
 * All queries use namespace partitioning per course_id to prevent cross-course scans.
 * Namespace pattern: "course_{courseId}" (e.g. "course_calc-1").
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { env } from '@/lib/env';
import { embedText, withGeminiRetry } from '@/lib/gemini';
import {
  shouldMirrorToVectorize,
  serializeVzMetadata,
  vectorizeUpsert,
  vectorizeDelete,
} from '@/lib/vectorize-client';

export interface ChunkMetadata {
  course_id: string;
  material_instance_id: string;
  section_id: string;
  chunk_id: string;
  chapter_name: string;
  keywords: string[];
  difficulty_target: string;
  [key: string]: string | string[] | number | boolean;
}

function getPinecone() {
  if (!env.PINECONE_API_KEY || !env.PINECONE_INDEX_NAME) {
    throw new Error(
      'PINECONE_API_KEY and PINECONE_INDEX_NAME must be set to use vector search features.',
    );
  }
  return new Pinecone({ apiKey: env.PINECONE_API_KEY });
}

export function getNs(courseId: string) {
  if (!env.PINECONE_INDEX_NAME) {
    throw new Error('PINECONE_INDEX_NAME must be set.');
  }
  return getPinecone().index(env.PINECONE_INDEX_NAME).namespace(`course_${courseId}`);
}

/**
 * Upserts a chunk vector into Pinecone (and mirrors to Vectorize when
 * VECTOR_STORE=dual|vectorize). The Vectorize write is fire-and-forget to
 * avoid adding latency to the admin material-instance routes.
 */
export async function upsertChunkVector(
  vectorId: string,
  chunkText: string,
  metadata: ChunkMetadata,
): Promise<void> {
  const values = await withGeminiRetry(() => embedText(chunkText));
  await getNs(metadata.course_id).upsert({
    records: [{ id: vectorId, values, metadata }],
  });
  if (shouldMirrorToVectorize()) {
    vectorizeUpsert([{
      id: vectorId,
      values,
      namespace: `course_${metadata.course_id}`,
      metadata: serializeVzMetadata(metadata as Record<string, unknown>),
    }]).catch((err) => console.error('[vectorize] chunk upsert mirror failed:', err));
  }
}

/**
 * Re-embeds updated chunk text and overwrites the Pinecone vector.
 * Called after updating an existing ai_material_instance_chunks row.
 */
export async function updateChunkVector(
  vectorId: string,
  newChunkText: string,
  metadata: ChunkMetadata,
): Promise<void> {
  await upsertChunkVector(vectorId, newChunkText, metadata);
}

/**
 * Deletes a single chunk vector from Pinecone (and mirrors to Vectorize when
 * VECTOR_STORE=dual|vectorize).
 */
export async function deleteChunkVector(
  courseId: string,
  vectorId: string,
): Promise<void> {
  await getNs(courseId).deleteOne({ id: vectorId });
  if (shouldMirrorToVectorize()) {
    vectorizeDelete([vectorId]).catch((err) =>
      console.error('[vectorize] chunk delete mirror failed:', err),
    );
  }
}

/**
 * Deletes all vectors belonging to a list of vector IDs from Pinecone (and
 * mirrors to Vectorize when VECTOR_STORE=dual|vectorize).
 */
export async function deleteSectionVectors(
  courseId: string,
  vectorIds: string[],
): Promise<void> {
  if (vectorIds.length === 0) return;
  await getNs(courseId).deleteMany({ ids: vectorIds });
  if (shouldMirrorToVectorize()) {
    vectorizeDelete(vectorIds).catch((err) =>
      console.error('[vectorize] section delete mirror failed:', err),
    );
  }
}

export interface VectorMatch {
  chunkId: string;
  sectionId: string;
  score: number;
}

/**
 * Embeds a query string and retrieves the Top-K most relevant chunk IDs
 * filtered to the given course_id namespace.
 */
export async function queryChunks(
  courseId: string,
  queryText: string,
  topK = 10,
): Promise<VectorMatch[]> {
  const queryVector = await withGeminiRetry(() => embedText(queryText));
  const result = await getNs(courseId).query({
    vector: queryVector,
    topK,
    includeMetadata: true,
  });

  return (result.matches ?? []).map((m) => ({
    chunkId: ((m.metadata as unknown) as ChunkMetadata).chunk_id,
    sectionId: ((m.metadata as unknown) as ChunkMetadata).section_id,
    score: m.score ?? 0,
  }));
}
