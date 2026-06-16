/**
 * P8 Vectorize Backfill ; one-shot migration script.
 *
 * Reads all vectors from every course namespace in Pinecone and upserts them
 * into the Vectorize index via the deployed zyx-vector-api Worker.
 * No re-embedding: raw values are forwarded as-is.
 *
 * Usage:
 * npx tsx scripts/vectorize-backfill.ts
 *
 * Required env vars (from .env or shell):
 * PINECONE_API_KEY, PINECONE_INDEX_NAME
 * TURSO_CONNECTION_URL (or DATABASE_URL for local SQLite)
 * TURSO_AUTH_TOKEN (optional for local dev)
 * VECTORIZE_WORKER_URL, VECTORIZE_SHARED_SECRET
 *
 * Run from the repo root after deploying the zyx-vector-api Worker.
 */

import 'dotenv/config';
import { Pinecone } from '@pinecone-database/pinecone';
import { createClient } from '@libsql/client';

const BATCH_SIZE = 100; // Pinecone fetch limit per call

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireEnv(key: string): string {
 const v = process.env[key];
 if (!v) throw new Error(`Missing required env var: ${key}`);
 return v;
}

async function vzPost(path: string, body: unknown): Promise<unknown> {
 const base = requireEnv('VECTORIZE_WORKER_URL');
 const secret = requireEnv('VECTORIZE_SHARED_SECRET');
 const res = await fetch(`${base}${path}`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 Authorization: `Bearer ${secret}`,
 },
 body: JSON.stringify(body),
 });
 if (!res.ok) {
 const text = await res.text();
 throw new Error(`Worker ${path} error ${res.status}: ${text}`);
 }
 return res.json();
}

function serializeMeta(
 raw: Record<string, unknown>,
): Record<string, string | number | boolean> {
 const out: Record<string, string | number | boolean> = {};
 for (const [k, v] of Object.entries(raw)) {
 if (Array.isArray(v)) {
 out[k] = JSON.stringify(v);
 } else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
 out[k] = v;
 }
 }
 return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
 const pineconeKey = requireEnv('PINECONE_API_KEY');
 const indexName = requireEnv('PINECONE_INDEX_NAME');
 const dbUrl = process.env.TURSO_CONNECTION_URL || process.env.DATABASE_URL || '';
 const authToken = process.env.TURSO_AUTH_TOKEN;

 if (!dbUrl) throw new Error('TURSO_CONNECTION_URL or DATABASE_URL must be set');

 // 1. Get all course IDs from the database
 const db = createClient({ url: dbUrl, authToken });
 const { rows } = await db.execute('SELECT id FROM courses');
 const courseIds = rows.map((r) => String(r[0] ?? r.id));
 console.log(`Found ${courseIds.length} courses: ${courseIds.join(', ')}`);

 const pinecone = new Pinecone({ apiKey: pineconeKey });
 const index = pinecone.index(indexName);

 let totalTransferred = 0;
 let totalSkipped = 0;

 // 2. For each course namespace, paginate Pinecone IDs, fetch values, upsert to Vectorize
 for (const courseId of courseIds) {
 const namespace = `course_${courseId}`;
 const ns = index.namespace(namespace);
 let paginationToken: string | undefined;
 let pageCount = 0;

 console.log(`\nProcessing namespace: ${namespace}`);

 do {
 // List a page of vector IDs
 const listResult = await ns.listPaginated(
 paginationToken ? { paginationToken } : {},
 );
 const ids = (listResult.vectors ?? [])
 .map((v) => v.id)
 .filter((id): id is string => !!id);
 paginationToken = listResult.pagination?.next;
 pageCount++;

 if (ids.length === 0) break;

 // Fetch full vectors in sub-batches of BATCH_SIZE
 for (let i = 0; i < ids.length; i += BATCH_SIZE) {
 const batchIds = ids.slice(i, i + BATCH_SIZE);
 const fetchResult = await ns.fetch({ ids: batchIds });
 const records = fetchResult.records ?? {};

 const vzVectors = Object.values(records)
 .filter((v) => v.values && v.values.length > 0)
 .map((v) => ({
 id: v.id,
 values: v.values,
 namespace,
 metadata: serializeMeta((v.metadata ?? {}) as Record<string, unknown>),
 }));

 if (vzVectors.length === 0) {
 totalSkipped += batchIds.length;
 continue;
 }

 await vzPost('/upsert', { vectors: vzVectors });
 totalTransferred += vzVectors.length;
 process.stdout.write(` upserted ${totalTransferred} vectors so far...\r`);
 }
 } while (paginationToken);

 console.log(` done ; ${pageCount} page(s) processed`);
 }

 console.log(`\nBackfill complete.`);
 console.log(` Transferred: ${totalTransferred}`);
 console.log(` Skipped (no values): ${totalSkipped}`);
 console.log(`\nNext: run "wrangler vectorize describe zyx-edu" to verify record count.`);
 console.log('Then update docs/baselines.md gate 8.2 with both counts.');
}

main().catch((err) => {
 console.error('Backfill failed:', err);
 process.exit(1);
});
