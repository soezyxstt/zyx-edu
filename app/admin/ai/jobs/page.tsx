import type { Metadata } from "next";
import { pageTitle } from "@/lib/site";
import { Reveal } from "@/components/ui/reveal";
import { db } from "@/db";
import { aiGenerationJobs, courses, chapters, knowledgeObjects } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { assertTutorOrAdmin } from "@/lib/uploadthing-admin";
import { GenerationJobsClient } from "./jobs-client";

export const metadata: Metadata = {
  title: pageTitle("Generation Jobs"),
};

export default async function GenerationJobsPage() {
  await assertTutorOrAdmin();

  const [jobs, allCourses, allChapters, allKOs] = await Promise.all([
    db
      .select({
        id: aiGenerationJobs.id,
        courseId: aiGenerationJobs.courseId,
        tutorId: aiGenerationJobs.tutorId,
        status: aiGenerationJobs.status,
        promptParameters: aiGenerationJobs.promptParameters,
        targetCount: aiGenerationJobs.targetCount,
        generatedCount: aiGenerationJobs.generatedCount,
        tokenUsage: aiGenerationJobs.tokenUsage,
        errorMessage: aiGenerationJobs.errorMessage,
        createdAt: aiGenerationJobs.createdAt,
        updatedAt: aiGenerationJobs.updatedAt,
      })
      .from(aiGenerationJobs)
      .orderBy(desc(aiGenerationJobs.createdAt))
      .limit(50),
    db.select({ id: courses.id, title: courses.title }).from(courses),
    db
      .select({ id: chapters.id, courseId: chapters.courseId, title: chapters.title, orderIndex: chapters.orderIndex })
      .from(chapters)
      .orderBy(chapters.orderIndex),
    db
      .select({ id: knowledgeObjects.id, courseId: knowledgeObjects.courseId, chapterId: knowledgeObjects.chapterId, title: knowledgeObjects.title, conceptName: knowledgeObjects.conceptName })
      .from(knowledgeObjects)
      .where(eq(knowledgeObjects.status, 'active')),
  ]);

  const courseMap = Object.fromEntries(allCourses.map((c) => [c.id, c.title]));

  return (
    <Reveal className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="font-heading text-h4 font-semibold text-foreground">Generation Jobs</h1>
        <p className="mt-2 text-body-sm text-muted-foreground">
          Pantau status pengerjaan generasi kuis/soal AI secara massal berdasarkan Objek Pengetahuan dan Bab.
        </p>
      </div>
      <GenerationJobsClient
        jobs={jobs}
        courses={allCourses}
        chapters={allChapters}
        knowledgeObjects={allKOs}
        courseMap={courseMap}
      />
    </Reveal>
  );
}
