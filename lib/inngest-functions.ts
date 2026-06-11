import { inngest } from "@/lib/inngest";
import { db } from "@/db";
import { vectorSyncQueue, knowledgeObjects, chapters, masterTeachingDocuments } from "@/db/schema";
import { getNs } from "@/lib/pinecone";
import { embedTexts } from "@/lib/gemini";
import { eq, and, or, lt, inArray } from "drizzle-orm";
import { generateFlashcardsForChapter } from "@/lib/flashcard-generator";
import { generateQuestionsForKO, generateQuestionsForKOBatch } from "@/lib/question-generator";
import { generateMarkdownForChapter } from "@/lib/material-generator";
import { saveWebsiteMaterial } from "@/lib/material-storage";

type VectorSyncRow = typeof vectorSyncQueue.$inferSelect;

// Retrieve configurable batch size from environment or config, defaulting to 50
const BATCH_SIZE = process.env.PINECONE_SYNC_BATCH_SIZE 
  ? parseInt(process.env.PINECONE_SYNC_BATCH_SIZE, 10) 
  : 50;

/**
 * Processes a single batch of pending outbox sync items.
 * Fetches rows, batch embeds them using text-embedding-004, upserts to Pinecone,
 * and updates their status in PostgreSQL.
 */
export async function processBatch(step: any, courseId?: string) {
  // Step 1: Fetch pending/failed queue rows from database
  const batch = await step.run("fetch-pending-batch", async () => {
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

    return await db
      .select()
      .from(vectorSyncQueue)
      .where(and(...filters))
      .limit(BATCH_SIZE);
  });

  if (batch.length === 0) {
    return { processed: 0, message: "No pending outbox records to process." };
  }

  const batchIds = batch.map((r: VectorSyncRow) => r.id);

  // Step 2: Mark records as processing inside DB to lock them
  await step.run("mark-records-processing", async () => {
    await db
      .update(vectorSyncQueue)
      .set({ status: "processing", updatedAt: new Date() })
      .where(inArray(vectorSyncQueue.id, batchIds));
  });

  // Step 3: Group by course namespace (to optimize embedding & Pinecone requests)
  const courseGroups: Record<string, VectorSyncRow[]> = {};
  for (const row of batch) {
    if (!courseGroups[row.courseId]) {
      courseGroups[row.courseId] = [];
    }
    courseGroups[row.courseId].push(row);
  }

  let successCount = 0;
  let failCount = 0;

  for (const [cId, rows] of Object.entries(courseGroups)) {
    try {
      // Step 4: Batch embed text-embedding-004
      const texts = rows.map((r: VectorSyncRow) => (r.payload as any).text);
      const embeddings = await step.run(`embed-texts-${cId}`, async () => {
        return await embedTexts(texts);
      });

      // Step 5: Upsert to Pinecone course namespace
      await step.run(`upsert-pinecone-${cId}`, async () => {
        const records = rows.map((row: VectorSyncRow, idx: number) => {
          const payload = row.payload as any;
          return {
            id: row.koId || "",
            values: embeddings[idx],
            metadata: {
              courseId: row.courseId,
              chapterId: payload.metadata.chapterId,
              conceptId: payload.metadata.conceptId || "",
              type: payload.metadata.type,
              bloomLevel: payload.metadata.bloomLevel,
              difficulty: payload.metadata.difficulty,
              importance: payload.metadata.importance || "medium",
              tags: payload.metadata.tags || [],
            }
          };
        });

        const ns = getNs(cId);
        await ns.upsert({ records });
      });

      // Step 6: Mark rows completed in database & update pineconeVectorId on KOs
      await step.run(`finalize-success-${cId}`, async () => {
        const rowIds = rows.map((r: VectorSyncRow) => r.id);

        await db.transaction(async (tx) => {
          // Set queue rows completed
          await tx
            .update(vectorSyncQueue)
            .set({ status: "completed", updatedAt: new Date() })
            .where(inArray(vectorSyncQueue.id, rowIds));

          // Set KO pineconeVectorId to the KO ID (synced successfully)
          for (const row of rows) {
            if (row.koId) {
              await tx
                .update(knowledgeObjects)
                .set({ pineconeVectorId: row.koId, updatedAt: new Date() })
                .where(eq(knowledgeObjects.id, row.koId));
            }
          }
        });
      });

      successCount += rows.length;
    } catch (err: any) {
      // Step 7: Handle failures for this specific course group
      await step.run(`handle-failure-${cId}`, async () => {
        const errorMessage = err?.message || String(err);
        
        for (const row of rows) {
          await db
            .update(vectorSyncQueue)
            .set({
              status: "failed", // remain in failed state to be retried by the cron/poller
              attempts: row.attempts + 1,
              lastError: errorMessage,
              updatedAt: new Date()
            })
            .where(eq(vectorSyncQueue.id, row.id));
        }
      });

      failCount += rows.length;
    }
  }

  return {
    processed: batch.length,
    success: successCount,
    failed: failCount
  };
}

/**
 * Event-driven worker listening to "vector.sync.dispatch"
 */
export const vectorSyncWorker = inngest.createFunction(
  {
    id: "vector-sync-worker",
    name: "Vector Sync Worker",
    triggers: [{ event: "vector.sync.dispatch" }]
  },
  async ({ event, step }) => {
    const { courseId } = event.data as { courseId: string };
    return await processBatch(step, courseId);
  }
);

/**
 * Scheduled cron worker running every 5 minutes
 */
export const vectorSyncCronWorker = inngest.createFunction(
  {
    id: "vector-sync-cron-worker",
    name: "Vector Sync Cron Worker",
    triggers: [{ cron: "*/5 * * * *" }]
  },
  async ({ step }) => {
    return await processBatch(step);
  }
);

/**
 * Event-driven worker listening to "ai.bulk.chapter.generate"
 */
export const bulkChapterGenerator = inngest.createFunction(
  {
    id: "bulk-chapter-generator",
    name: "Bulk Chapter Generator",
    triggers: [{ event: "ai.bulk.chapter.generate" }]
  },
  async ({ event, step }) => {
    const { chapterId } = event.data as { chapterId: string };

    try {
      // Step 1: Identify chapter and course
      const info = await step.run("fetch-chapter-info", async () => {
        const [chapterRec] = await db
          .select()
          .from(chapters)
          .where(eq(chapters.id, chapterId));
        return chapterRec || null;
      });

      if (!info) {
        throw new Error(`Chapter ${chapterId} not found`);
      }

      // Fetch active KOs first so we can initialize the questionsTotal count
      const activeKOs = await step.run("fetch-active-kos", async () => {
        return await db
          .select({ id: knowledgeObjects.id, title: knowledgeObjects.title })
          .from(knowledgeObjects)
          .where(
            and(
              eq(knowledgeObjects.chapterId, chapterId),
              eq(knowledgeObjects.status, "active")
            )
          );
      });

      // Initialize status & progress in chapters table
      await step.run("init-progress", async () => {
        await db
          .update(chapters)
          .set({
            assetGenStatus: "generating",
            assetGenFlashcardsTotal: 0,
            assetGenFlashcardsCurrent: 0,
            assetGenQuestionsTotal: activeKOs.length,
            assetGenQuestionsCurrent: 0,
            assetGenError: null,
            updatedAt: new Date(),
          })
          .where(eq(chapters.id, chapterId));
      });

      // Step 2: Generate Flashcards for target Mastery Units
      const fcCount = await step.run("generate-flashcards", async () => {
        return await generateFlashcardsForChapter(chapterId);
      });

      // Update flashcards progress
      await step.run("update-flashcard-progress", async () => {
        await db
          .update(chapters)
          .set({
            assetGenFlashcardsTotal: fcCount,
            assetGenFlashcardsCurrent: fcCount,
            updatedAt: new Date(),
          })
          .where(eq(chapters.id, chapterId));
      });

      let questionCount = 0;
      let currentIdx = 0;
      const BATCH_SIZE_Q = 5;
      for (let i = 0; i < activeKOs.length; i += BATCH_SIZE_Q) {
        const koBatch = activeKOs.slice(i, i + BATCH_SIZE_Q);
        const koIds = koBatch.map(ko => ko.id);

        const qRes = await step.run(`generate-questions-ko-batch-${i}`, async () => {
          return await generateQuestionsForKOBatch(koIds);
        });

        for (const result of qRes.results) {
          if (result.success) {
            questionCount += result.insertedCount;
          }
          currentIdx++;
        }

        // Update question progress
        await step.run(`update-question-progress-batch-${i}`, async () => {
          await db
            .update(chapters)
            .set({
              assetGenQuestionsCurrent: currentIdx,
              updatedAt: new Date(),
            })
            .where(eq(chapters.id, chapterId));
        });
      }

      // Step 4: Generate Website Material Markdown and compile Website Material
      await step.run("generate-website-material", async () => {
        const compiledMarkdown = await generateMarkdownForChapter(chapterId);

        const [mtd] = await db
          .select()
          .from(masterTeachingDocuments)
          .where(eq(masterTeachingDocuments.courseId, info.courseId));

        const authorId = mtd?.createdById || "system";

        await saveWebsiteMaterial(
          chapterId,
          compiledMarkdown,
          authorId,
          "AI Automatic Curation Bulk Generation",
          true // isAiGenerated
        );
      });

      // Step 5: Sync metadata-linked vector indexes to Pinecone immediately
      const syncRes = await processBatch(step, info.courseId);

      // Set completed status
      await step.run("complete-progress", async () => {
        await db
          .update(chapters)
          .set({
            assetGenStatus: "completed",
            updatedAt: new Date(),
          })
          .where(eq(chapters.id, chapterId));
      });

      return {
        success: true,
        flashcardsGenerated: fcCount,
        questionsGenerated: questionCount,
        vectorSync: syncRes,
      };
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      await step.run("fail-progress", async () => {
        await db
          .update(chapters)
          .set({
            assetGenStatus: "failed",
            assetGenError: errorMessage,
            updatedAt: new Date(),
          })
          .where(eq(chapters.id, chapterId));
      });
      return { success: false, error: errorMessage };
    }
  }
);

