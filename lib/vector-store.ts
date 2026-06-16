/**
 * Vector store abstraction (P3, standing decision 2).
 *
 * Pinecone is the default forever; this file is the permanent seam so the
 * conditional Vectorize migration (P8) never touches call-sites.
 *
 * VECTOR_STORE env controls which backend is used:
 * 'pinecone' (default) ; Pinecone reads and writes
 * 'dual' ; Pinecone reads, writes go to both (soak period)
 * 'vectorize' ; Vectorize reads, writes still mirror to both until
 * P8 cleanup removes the Pinecone write paths
 *
 * The course namespace holds two vector kinds:
 * - material chunks (metadata: chunk_id, section_id, chapter_name, …)
 * - knowledge objects (id = koId, metadata: chapterId, conceptId, type, …)
 */

import {
 getNs,
 upsertChunkVector,
 deleteSectionVectors,
 type ChunkMetadata,
} from '@/lib/pinecone';
import { embedText, withGeminiRetry } from '@/lib/gemini';
import {
 shouldReadFromVectorize,
 serializeVzMetadata,
 vectorizeUpsert,
 vectorizeQuery,
 vectorizeDelete,
} from '@/lib/vectorize-client';

export interface VectorStoreMatch {
 id: string;
 score: number;
 metadata: Record<string, unknown>;
}

export interface VectorStoreQueryOptions {
 topK?: number;
 /** Pinecone metadata filter, e.g. { chapterId: "…" }. Provider-native shape. */
 filter?: Record<string, unknown>;
}

export interface VectorStore {
 query(
 courseId: string,
 queryText: string,
 options?: VectorStoreQueryOptions,
 ): Promise<VectorStoreMatch[]>;
 upsert(vectorId: string, text: string, metadata: ChunkMetadata): Promise<void>;
 delete(courseId: string, vectorIds: string[]): Promise<void>;
}

// ---------------------------------------------------------------------------
// PineconeStore ; default backend
// ---------------------------------------------------------------------------

export class PineconeStore implements VectorStore {
 async query(
 courseId: string,
 queryText: string,
 options: VectorStoreQueryOptions = {},
 ): Promise<VectorStoreMatch[]> {
 try {
 const vector = await withGeminiRetry(() => embedText(queryText));
 const result = await getNs(courseId).query({
 vector,
 topK: options.topK ?? 10,
 includeMetadata: true,
 ...(options.filter ? { filter: options.filter } : {}),
 });
 return (result.matches ?? []).map((m) => ({
 id: m.id,
 score: m.score ?? 0,
 metadata: (m.metadata ?? {}) as Record<string, unknown>,
 }));
 } catch (err) {
 console.error('[vector-store] Pinecone query failed, degrading to ungrounded:', err);
 return [];
 }
 }

 async upsert(vectorId: string, text: string, metadata: ChunkMetadata): Promise<void> {
 await upsertChunkVector(vectorId, text, metadata);
 }

 async delete(courseId: string, vectorIds: string[]): Promise<void> {
 await deleteSectionVectors(courseId, vectorIds);
 }
}

// ---------------------------------------------------------------------------
// VectorizeStore ; P8 backend
// ---------------------------------------------------------------------------

export class VectorizeStore implements VectorStore {
 async query(
 courseId: string,
 queryText: string,
 options: VectorStoreQueryOptions = {},
 ): Promise<VectorStoreMatch[]> {
 try {
 const vector = await withGeminiRetry(() => embedText(queryText));
 const matches = await vectorizeQuery(
 vector,
 options.topK ?? 10,
 `course_${courseId}`,
 options.filter,
 );
 return matches.map((m) => ({
 id: m.id,
 score: m.score,
 metadata: (m.metadata ?? {}) as Record<string, unknown>,
 }));
 } catch (err) {
 console.error('[vector-store] Vectorize query failed, degrading to ungrounded:', err);
 return [];
 }
 }

 async upsert(vectorId: string, text: string, metadata: ChunkMetadata): Promise<void> {
 const values = await withGeminiRetry(() => embedText(text));
 await vectorizeUpsert([{
 id: vectorId,
 values,
 namespace: `course_${metadata.course_id}`,
 metadata: serializeVzMetadata(metadata as Record<string, unknown>),
 }]);
 }

 async delete(_courseId: string, vectorIds: string[]): Promise<void> {
 await vectorizeDelete(vectorIds);
 }
}

// ---------------------------------------------------------------------------
// Singleton export ; selected by VECTOR_STORE env
// ---------------------------------------------------------------------------

function createVectorStore(): VectorStore {
 // Vectorize in production (better storage limits), Pinecone in dev/test.
 // VECTOR_STORE env overrides the default when needed (e.g. dual during migration).
 if (process.env.NODE_ENV === 'production') return new VectorizeStore();
 if (shouldReadFromVectorize()) return new VectorizeStore();
 return new PineconeStore();
}

/** All retrieval call-sites go through this singleton, never Pinecone directly. */
export const vectorStore: VectorStore = createVectorStore();

// Re-export ChunkMetadata so callers don't need to reach into lib/pinecone.
export type { ChunkMetadata };
