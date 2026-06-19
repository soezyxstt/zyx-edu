import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { db } from "../db";
import { vectorSyncQueue, knowledgeObjects } from "../db/schema";
import { eq, and, or, lt, inArray } from "drizzle-orm";
import { getNs } from "../lib/pinecone";
import { embedTexts } from "../lib/gemini";
import { shouldMirrorToVectorize, serializeVzMetadata, vectorizeUpsert } from "../lib/vectorize-client";
import { VECTOR_NAMESPACES } from "../lib/vector-store";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  
  let courseId: string | null = null;
  const courseIdx = args.indexOf("--course");
  if (courseIdx !== -1 && args[courseIdx + 1]) {
    courseId = args[courseIdx + 1];
  }

  let limit = 50;
  const limitIdx = args.indexOf("--limit");
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    limit = parseInt(args[limitIdx + 1], 10);
  }

  console.log(`=== RUNNING VECTOR SYNC RUNNER (Dry Run: ${dryRun}, Course: ${courseId || "all"}, Limit: ${limit}) ===\n`);

  const filters = [
    or(
      eq(vectorSyncQueue.status, "pending"),
      eq(vectorSyncQueue.status, "failed")
    ),
    lt(vectorSyncQueue.attempts, 10)
  ];
  if (courseId) {
    filters.push(eq(vectorSyncQueue.courseId, courseId));
  }

  const pendingRows = await db
    .select()
    .from(vectorSyncQueue)
    .where(and(...filters))
    .limit(limit);

  if (pendingRows.length === 0) {
    console.log("No pending or failed outbox sync records found. Everything is synced!");
    process.exit(0);
  }

  console.log(`Found ${pendingRows.length} outbox records to process.`);

  // Group by cId & namespace
  const groups: Record<string, typeof pendingRows> = {};
  for (const row of pendingRows) {
    const key = `${row.courseId}:${row.namespace}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(row);
  }

  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  for (const [key, rows] of Object.entries(groups)) {
    const [cId, namespace] = key.split(":");
    const safeNamespace = namespace || VECTOR_NAMESPACES.learning;
    console.log(`Processing group courseId=${cId}, namespace=${safeNamespace} (${rows.length} rows)`);

    try {
      const texts = rows.map(r => (r.payload as any).text);
      
      let embeddings: number[][];
      if (dryRun) {
        // Mock embeddings in dry-run to save API quota
        embeddings = rows.map(() => new Array(768).fill(0));
      } else {
        console.log(`  Embedding ${texts.length} texts via text-embedding-004...`);
        embeddings = await embedTexts(texts);
      }

      const records = rows.map((row, idx) => {
        const payload = row.payload as any;
        return {
          id: row.koId || payload.id || row.id,
          values: embeddings[idx],
          metadata: {
            courseId: row.courseId,
            chapterId: payload.metadata.chapterId || "",
            conceptId: payload.metadata.conceptId || "",
            type: payload.metadata.type || "unknown",
            bloomLevel: payload.metadata.bloomLevel || "apply",
            difficulty: payload.metadata.difficulty || "medium",
            importance: payload.metadata.importance || "medium",
            tags: payload.metadata.tags || [],
          }
        };
      });

      if (!dryRun) {
        // Upsert to Pinecone
        const ns = getNs(`${cId}_${safeNamespace}`);
        console.log(`  Upserting to Pinecone namespace course_${cId}_${safeNamespace}...`);
        await ns.upsert({ records });

        // Mirror to Vectorize
        if (shouldMirrorToVectorize()) {
          console.log(`  Mirroring to Vectorize namespace course_${cId}_${safeNamespace}...`);
          await vectorizeUpsert(
            records.map(r => ({
              id: r.id,
              values: r.values,
              namespace: `course_${cId}_${safeNamespace}`,
              metadata: serializeVzMetadata(r.metadata),
            }))
          );
        }

        // Finalize database transaction
        await db.transaction(async (tx) => {
          const rowIds = rows.map(r => r.id);
          await tx
            .update(vectorSyncQueue)
            .set({ status: "completed", updatedAt: new Date() })
            .where(inArray(vectorSyncQueue.id, rowIds));

          for (const row of rows) {
            if (row.koId && row.namespace === VECTOR_NAMESPACES.learning) {
              await tx
                .update(knowledgeObjects)
                .set({ pineconeVectorId: row.koId, updatedAt: new Date() })
                .where(eq(knowledgeObjects.id, row.koId));
            }
          }
        });
        console.log(`  [SUCCESS] Successfully synced database status.`);
      } else {
        console.log(`  [DRY-RUN] Would have synced ${records.length} records successfully.`);
      }
      successCount += rows.length;
    } catch (err: any) {
      console.error(`  [FAIL] Group sync failed:`, err?.message || err);
      failCount += rows.length;

      if (!dryRun) {
        for (const row of rows) {
          await db
            .update(vectorSyncQueue)
            .set({
              status: "failed",
              attempts: row.attempts + 1,
              lastError: err?.message || String(err),
              updatedAt: new Date(),
            })
            .where(eq(vectorSyncQueue.id, row.id));
        }
      }
    }
  }

  console.log("\n=== VECTOR SYNC RUN COMPLETED ===");
  console.log(`Processed (Success): ${successCount}`);
  console.log(`Failures:            ${failCount}`);
  console.log(`Skipped:             ${skippedCount}`);

  if (failCount > 0 && !dryRun) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Runner crashed:", err);
  process.exit(1);
});
