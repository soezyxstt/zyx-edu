import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageTitle } from "@/lib/site";
import { Reveal } from "@/components/ui/reveal";
import { db } from "@/db";
import { aiMaterialInstances, courses, chapters, knowledgeObjects, websiteMaterials } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { assertAdmin } from "@/lib/uploadthing-admin";
import { MaterialDetailClient } from "./detail-client";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const instance = await db.query.aiMaterialInstances.findFirst({
    where: eq(aiMaterialInstances.id, id),
  });
  return {
    title: pageTitle(instance ? `Detail: ${instance.title.replace(/^\[DRAF\]\s*/, "")}` : "Detail Materi"),
  };
}

export default async function MaterialDetailPage({ params }: Props) {
  await assertAdmin();
  const { id } = await params;

  const instance = await db.query.aiMaterialInstances.findFirst({
    where: eq(aiMaterialInstances.id, id),
  });

  if (!instance) {
    notFound();
  }

  const course = await db.query.courses.findFirst({
    where: eq(courses.id, instance.courseId),
  });

  if (!course) {
    notFound();
  }

  // Get all chapters for this course
  const courseChapters = await db.query.chapters.findMany({
    where: eq(chapters.courseId, instance.courseId),
    orderBy: [asc(chapters.orderIndex)],
  });

  // Get all knowledge objects for this course
  const kos = await db.query.knowledgeObjects.findMany({
    where: eq(knowledgeObjects.courseId, instance.courseId),
    orderBy: [asc(knowledgeObjects.learningOrder)],
  });

  // Get website materials
  const webMaterials = await db.query.websiteMaterials.findMany({
    where: eq(websiteMaterials.courseId, instance.courseId),
  });

  return (
    <Reveal className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <MaterialDetailClient
        instance={instance}
        course={course}
        chapters={courseChapters}
        knowledgeObjects={kos}
        websiteMaterials={webMaterials}
      />
    </Reveal>
  );
}
