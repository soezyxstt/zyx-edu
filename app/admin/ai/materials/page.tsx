import type { Metadata } from "next";
import { pageTitle } from "@/lib/site";
import { Reveal } from "@/components/ui/reveal";
import { db } from "@/db";
import { aiMaterialInstances, courses } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { assertAdmin } from "@/lib/uploadthing-admin";
import { MaterialInstancesClient } from "./materials-client";

export const metadata: Metadata = {
  title: pageTitle("Materi AI"),
};

export default async function AIMaterialsPage() {
  await assertAdmin();

  const [instances, allCourses] = await Promise.all([
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
    db.select({ id: courses.id, title: courses.title }).from(courses),
  ]);

  const courseMap = Object.fromEntries(allCourses.map((c) => [c.id, c.title]));

  return (
    <Reveal className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="font-heading text-h4 font-semibold text-foreground">Materi AI</h1>
        <p className="mt-2 text-body-sm text-muted-foreground">
          Upload dan kelola materi kursus yang diproses menjadi basis pengetahuan AI untuk generasi soal.
        </p>
      </div>
      <MaterialInstancesClient instances={instances} courses={allCourses} courseMap={courseMap} />
    </Reveal>
  );
}
