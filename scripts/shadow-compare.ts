/**
 * P8 Shadow Compare ; gate 8.3 validation script.
 *
 * Runs 50 queries (sampled from knowledge_objects.title) against both Pinecone
 * and Vectorize in parallel, then computes overlap@5. Prints per-query detail
 * and a PASS/FAIL summary.
 *
 * Gate 8.3 passes when overlap@5 >= 80% across all queries.
 *
 * Usage:
 * npx tsx scripts/shadow-compare.ts
 *
 * Required env vars (from .env or shell):
 * PINECONE_API_KEY, PINECONE_INDEX_NAME
 * GEMINI_API_KEY
 * TURSO_CONNECTION_URL (or DATABASE_URL for local SQLite)
 * TURSO_AUTH_TOKEN (optional for local dev)
 * VECTORIZE_WORKER_URL, VECTORIZE_SHARED_SECRET
 *
 * No VECTOR_STORE env needed ; this script explicitly queries both stores.
 */

import 'dotenv/config';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@libsql/client';

const TOP_K = 5;
const SAMPLE_SIZE = 50;
const PASS_THRESHOLD = 0.8;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireEnv(key: string): string {
 const v = process.env[key];
 if (!v) throw new Error(`Missing required env var: ${key}`);
 return v;
}

async function embed(text: string, ai: GoogleGenAI): Promise<number[]> {
 const models = ['gemini-embedding-2', 'gemini-embedding-002', 'gemini-embedding-001'];
 for (const model of models) {
 try {
 const result = await ai.models.embedContent({
 model,
 contents: text,
 config: { outputDimensionality: 1024 },
 });
 const values = result.embeddings?.[0]?.values;
 if (values && values.length > 0) return values;
 } catch {
 // try next model
 }
 }
 throw new Error(`All Gemini embedding models failed for text: ${text.slice(0, 80)}`);
}

async function queryPinecone(
 vector: number[],
 namespace: string,
 pinecone: Pinecone,
 indexName: string,
): Promise<string[]> {
 const result = await pinecone.index(indexName).namespace(namespace).query({
 vector,
 topK: TOP_K,
 includeMetadata: false,
 });
 return (result.matches ?? []).map((m) => m.id);
}

async function queryVectorize(
 vector: number[],
 namespace: string,
): Promise<string[]> {
 const base = requireEnv('VECTORIZE_WORKER_URL');
 const secret = requireEnv('VECTORIZE_SHARED_SECRET');
 const res = await fetch(`${base}/query`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 Authorization: `Bearer ${secret}`,
 },
 body: JSON.stringify({ vector, topK: TOP_K, namespace, returnMetadata: 'none' }),
 });
 if (!res.ok) throw new Error(`Vectorize query error ${res.status}: ${await res.text()}`);
 const data = await res.json() as { matches?: { id: string }[] };
 return (data.matches ?? []).map((m) => m.id);
}

function overlap(a: string[], b: string[]): number {
 const setB = new Set(b);
 return a.filter((id) => setB.has(id)).length / TOP_K;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
 const pineconeKey = requireEnv('PINECONE_API_KEY');
 const indexName = requireEnv('PINECONE_INDEX_NAME');
 const geminiKey = requireEnv('GEMINI_API_KEY');
 const dbUrl = process.env.TURSO_CONNECTION_URL || process.env.DATABASE_URL || '';
 const authToken = process.env.TURSO_AUTH_TOKEN;

 if (!dbUrl) throw new Error('TURSO_CONNECTION_URL or DATABASE_URL must be set');

 const db = createClient({ url: dbUrl, authToken });
 const ai = new GoogleGenAI({ apiKey: geminiKey });
 const pinecone = new Pinecone({ apiKey: pineconeKey });

 // 1. Sample KO titles and their course IDs for realistic query distribution
 const { rows } = await db.execute(
 `SELECT ko.title, ko.course_id
 FROM knowledge_objects ko
 WHERE ko.status = 'active'
 ORDER BY RANDOM()
 LIMIT ${SAMPLE_SIZE}`,
 );

 if (rows.length === 0) {
 console.error('No active knowledge objects found. Run the bulk generator first.');
 process.exit(1);
 }

 const samples = rows.map((r) => ({
 title: String(r[0] ?? r.title ?? ''),
 courseId: String(r[1] ?? r.course_id ?? ''),
 })).filter((s) => s.title && s.courseId);

 console.log(`Shadow comparing ${samples.length} queries (top-${TOP_K} overlap@5)...\n`);

 let totalOverlap = 0;
 let queryIndex = 0;

 for (const { title, courseId } of samples) {
 queryIndex++;
 const namespace = `course_${courseId}`;
 let pIds: string[] = [];
 let vzIds: string[] = [];
 let overlapScore = 0;
 let error = '';

 try {
 const vector = await embed(title, ai);
 [pIds, vzIds] = await Promise.all([
 queryPinecone(vector, namespace, pinecone, indexName),
 queryVectorize(vector, namespace),
 ]);
 overlapScore = overlap(pIds, vzIds);
 totalOverlap += overlapScore;
 } catch (err) {
 error = err instanceof Error ? err.message : String(err);
 }

 const pct = (overlapScore * 100).toFixed(0).padStart(3);
 const status = error ? 'ERR' : overlapScore >= PASS_THRESHOLD ? ' OK' : 'LOW';
 console.log(
 `[${String(queryIndex).padStart(2)}/${samples.length}] ${status} ${pct}% | ${title.slice(0, 60)}${error ? ` | ${error}` : ''}`,
 );
 }

 const avgOverlap = totalOverlap / samples.length;
 const passed = avgOverlap >= PASS_THRESHOLD;

 console.log(`\n${'─'.repeat(72)}`);
 console.log(`Average overlap@${TOP_K}: ${(avgOverlap * 100).toFixed(1)}%`);
 console.log(`Gate 8.3 threshold: ${(PASS_THRESHOLD * 100).toFixed(0)}%`);
 console.log(`Result: ${passed ? 'PASS' : 'FAIL'}`);
 console.log('─'.repeat(72));

 if (passed) {
 console.log('\nGate 8.3 passed. Update docs/baselines.md, then switch to VECTOR_STORE=vectorize.');
 } else {
 console.log('\nGate 8.3 FAILED. Check backfill completeness before switching reads to Vectorize.');
 }

 process.exit(passed ? 0 : 1);
}

main().catch((err) => {
 console.error('Shadow compare failed:', err);
 process.exit(1);
});
