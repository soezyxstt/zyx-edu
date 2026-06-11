/**
 * AI Question Generation Pipeline (Knowledge Object Architecture)
 *
 * Workflow:
 *   Tutor Request → Create Job → Fetch KOs → Generate questions for each KO → Complete Job
 *
 * Runs asynchronously; the HTTP handler returns the job ID immediately.
 * The pipeline updates ai_generation_jobs status as it progresses.
 */

import { randomUUID } from 'crypto';
import { db } from '@/db';
import { aiGenerationJobs, knowledgeObjects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateQuestionsForKO, generateQuestionsForKOBatch } from '@/lib/question-generator';

export interface GenerationJobParams {
  courseId: string;
  tutorId: string;
  chapterId: string;
  koId?: string;
  targetCount: number;
}

/** Helper function to update background job progress logs. */
export async function updateJobProgress(jobId: string, step: string): Promise<void> {
  const [job] = await db
    .select({ promptParameters: aiGenerationJobs.promptParameters })
    .from(aiGenerationJobs)
    .where(eq(aiGenerationJobs.id, jobId))
    .limit(1);

  if (job) {
    const params = (job.promptParameters as Record<string, any>) || {};
    const logs = (params.logs as string[]) || [];
    logs.push(`[${new Date().toLocaleString("id-ID")}] ${step}`);
    
    await db
      .update(aiGenerationJobs)
      .set({
        promptParameters: { ...params, logs },
        updatedAt: new Date(),
      })
      .where(eq(aiGenerationJobs.id, jobId));
  }
}

/** Creates a job row and kicks off the background pipeline. Returns the job ID. */
export async function startGenerationJob(params: GenerationJobParams): Promise<string> {
  const jobId = randomUUID();
  const { courseId, tutorId, chapterId, koId, targetCount } = params;

  await db.insert(aiGenerationJobs).values({
    id: jobId,
    tutorId,
    courseId,
    status: 'pending',
    promptParameters: { 
      chapterId, 
      koId, 
      logs: [`[${new Date().toLocaleString("id-ID")}] Job dibuat.`] 
    } as Record<string, unknown>,
    targetCount,
    generatedCount: 0,
    tokenUsage: 0,
  });

  // Fire-and-forget: don't await the pipeline
  runPipeline(jobId, params).catch(async (err) => {
    try {
      await updateJobProgress(jobId, `Error pipeline: ${String(err)}`);
    } catch (_) {}
    await db
      .update(aiGenerationJobs)
      .set({ status: 'failed', errorMessage: String(err), updatedAt: new Date() })
      .where(eq(aiGenerationJobs.id, jobId));
  });

  return jobId;
}

async function runPipeline(jobId: string, params: GenerationJobParams): Promise<void> {
  const { courseId, chapterId, koId } = params;

  // Mark as processing
  await db
    .update(aiGenerationJobs)
    .set({ status: 'processing', updatedAt: new Date() })
    .where(eq(aiGenerationJobs.id, jobId));
  
  await updateJobProgress(jobId, 'Status diubah ke processing. Memulai pipeline generasi berbasis Knowledge Objects.');

  // Fetch KOs to generate questions for
  const conditions = [
    eq(knowledgeObjects.courseId, courseId),
    eq(knowledgeObjects.chapterId, chapterId),
    eq(knowledgeObjects.status, 'active'),
  ];
  if (koId && koId !== 'all') {
    conditions.push(eq(knowledgeObjects.id, koId));
  }

  const activeKOs = await db
    .select({ id: knowledgeObjects.id, title: knowledgeObjects.title })
    .from(knowledgeObjects)
    .where(and(...conditions));

  if (activeKOs.length === 0) {
    await updateJobProgress(jobId, 'Tidak ada Objek Pengetahuan aktif ditemukan.');
    await db
      .update(aiGenerationJobs)
      .set({ status: 'failed', errorMessage: 'Tidak ada Objek Pengetahuan aktif untuk diproses.', updatedAt: new Date() })
      .where(eq(aiGenerationJobs.id, jobId));
    return;
  }

  await updateJobProgress(jobId, `Menemukan ${activeKOs.length} Objek Pengetahuan aktif untuk diproses.`);

  let successCount = 0;
  const errors: string[] = [];

  const BATCH_SIZE = 5;
  for (let i = 0; i < activeKOs.length; i += BATCH_SIZE) {
    const koBatch = activeKOs.slice(i, i + BATCH_SIZE);
    const koIds = koBatch.map(ko => ko.id);
    
    try {
      await updateJobProgress(jobId, `Memulai batch generasi soal kuis untuk ${koIds.length} Objek Pengetahuan.`);
      const res = await generateQuestionsForKOBatch(koIds);
      
      for (const result of res.results) {
        const koTitle = activeKOs.find(k => k.id === result.koId)?.title || result.koId;
        if (result.success) {
          successCount += result.insertedCount;
          await updateJobProgress(jobId, `Berhasil membuat soal untuk KO: "${koTitle}" (${result.insertedCount} soal dimasukkan).`);
        } else {
          const koError = result.errors.join('; ');
          errors.push(`KO "${koTitle}": ${koError}`);
          await updateJobProgress(jobId, `Gagal membuat soal untuk KO: "${koTitle}". Detail: ${koError}`);
        }
      }
      
      // Update generatedCount incrementally in DB
      await db
        .update(aiGenerationJobs)
        .set({ generatedCount: successCount, updatedAt: new Date() })
        .where(eq(aiGenerationJobs.id, jobId));
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      errors.push(`Batch KOs [${koIds.join(', ')}]: ${errMsg}`);
      await updateJobProgress(jobId, `Error saat memproses batch KO. Detail: ${errMsg}`);
    }
  }

  if (errors.length > 0) {
    await updateJobProgress(jobId, `Generasi selesai dengan beberapa kesalahan. Jumlah kesalahan: ${errors.length}.`);
  } else {
    await updateJobProgress(jobId, 'Generasi selesai untuk semua Objek Pengetahuan.');
  }

  // Mark job as completed
  await db
    .update(aiGenerationJobs)
    .set({
      status: errors.length === activeKOs.length ? 'failed' : 'completed',
      generatedCount: successCount,
      errorMessage: errors.length > 0 ? `Beberapa KO gagal diproses:\n${errors.slice(0, 3).join('\n')}` : null,
      updatedAt: new Date(),
    })
    .where(eq(aiGenerationJobs.id, jobId));
  
  await updateJobProgress(jobId, `Status job diperbarui. Pipeline selesai.`);
}

