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

function getNs(courseId: string) {
  if (!env.PINECONE_INDEX_NAME) {
    throw new Error('PINECONE_INDEX_NAME must be set.');
  }
  return getPinecone().index(env.PINECONE_INDEX_NAME).namespace(`course_${courseId}`);
}

/**
 * Upserts a chunk vector into Pinecone.
 * Called after saving a new ai_material_instance_chunks row.
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
 * Deletes a single chunk vector from Pinecone.
 * Called after deleting an ai_material_instance_chunks row.
 */
export async function deleteChunkVector(
  courseId: string,
  vectorId: string,
): Promise<void> {
  await getNs(courseId).deleteOne({ id: vectorId });
}

/**
 * Deletes all vectors belonging to a list of vector IDs.
 * Called when an entire section is removed.
 */
export async function deleteSectionVectors(
  courseId: string,
  vectorIds: string[],
): Promise<void> {
  if (vectorIds.length === 0) return;
  await getNs(courseId).deleteMany({ ids: vectorIds });
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
