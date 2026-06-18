import type { Metadata } from "next";
import { pageTitle } from "@/lib/site";
import { Reveal } from "@/components/ui/reveal";
import { db } from "@/db";
import { aiMaterialInstances, courses, chapters, masterTeachingDocuments } from "@/db/schema";
import { desc, eq, asc } from "drizzle-orm";
import { assertAdmin } from "@/lib/uploadthing-admin";
import { MaterialInstancesClient } from "./materials-client";

export const metadata: Metadata = {
  title: pageTitle("Materi"),
};

export default async function AIMaterialsPage() {
  await assertAdmin();

  const [instances, assessments, allCourses, allChapters] = await Promise.all([
    db
      .select({
        id: aiMaterialInstances.id,
        title: aiMaterialInstances.title,
        courseId: aiMaterialInstances.courseId,
        sourceType: aiMaterialInstances.sourceType,
        summary: aiMaterialInstances.summary,
        keywords: aiMaterialInstances.keywords,
        pineconeSyncStatus: aiMaterialInstances.pineconeSyncStatus,
        lastSyncError: aiMaterialInstances.lastSyncError,
        createdAt: aiMaterialInstances.createdAt,
      })
      .from(aiMaterialInstances)
      .orderBy(desc(aiMaterialInstances.createdAt))
      .limit(100),
    db
      .select({
        id: masterTeachingDocuments.id,
        title: masterTeachingDocuments.title,
        courseId: masterTeachingDocuments.courseId,
        version: masterTeachingDocuments.version,
        status: masterTeachingDocuments.status,
        createdAt: masterTeachingDocuments.createdAt,
      })
      .from(masterTeachingDocuments)
      .where(eq(masterTeachingDocuments.type, 'assessment'))
      .orderBy(desc(masterTeachingDocuments.createdAt))
      .limit(100),
    db.select({ id: courses.id, title: courses.title }).from(courses),
    db.select().from(chapters).orderBy(asc(chapters.orderIndex)),
  ]);

  const courseMap = Object.fromEntries(allCourses.map((c) => [c.id, c.title]));

  return (
    <Reveal className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="font-heading text-h4 font-semibold text-foreground">Materi</h1>
        <p className="mt-2 text-body-sm text-muted-foreground">
          Upload dan kelola materi kursus yang diproses menjadi basis pengetahuan untuk generasi soal.
        </p>
      </div>
      <MaterialInstancesClient
        instances={instances}
        assessments={assessments}
        courses={allCourses}
        chapters={allChapters}
        courseMap={courseMap}
      />
    </Reveal>
  );
}
