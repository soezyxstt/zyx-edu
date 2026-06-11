import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { checkEnrollment } from "@/app/dashboard/actions";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { MaterialViewer } from "@/components/course/material-viewer";
import { EnrollmentForm } from "@/components/enrollment-form";
import { Reveal } from "@/components/ui/reveal";
import { pageTitle } from "@/lib/site";
import { getCourseById, getMaterial, type CourseMaterial } from "@/lib/student-course-fixtures";
import { db } from "@/db";
import { aiMaterialInstances } from "@/db/schema";
import { eq } from "drizzle-orm";

type Props = { params: Promise<{ id: string; materialId: string }> };

async function fetchMaterial(courseId: string, materialId: string): Promise<CourseMaterial | undefined> {
  const staticMat = getMaterial(courseId, materialId);
  if (staticMat) return staticMat;

  try {
    const dbMaterial = await db.query.aiMaterialInstances.findFirst({
      where: eq(aiMaterialInstances.id, materialId),
      with: {
        sections: {
          orderBy: (s, { asc }) => [asc(s.orderIndex)],
          with: {
            chunks: {
              orderBy: (c, { asc }) => [asc(c.orderIndex)],
            },
          },
        },
      },
    });

    if (dbMaterial) {
      const body = dbMaterial.sections
        .map((s) => {
          const sectionTitle = s.title ? `## ${s.title}\n\n` : "";
          const content = s.chunks.map((c) => c.chunkText).join("\n\n");
          return sectionTitle + content;
        })
        .join("\n\n");

      return {
        id: dbMaterial.id,
        courseId,
        title: dbMaterial.title.replace(/^\[DRAF\]\s*/, ""),
        kind: "article",
        docCategory: dbMaterial.title.toLowerCase().includes("diktat") ? "diktat" : "materi",
        fileSize: "AI Generated",
        body,
        completed: false,
        isPastYear: false,
        isPreview: true, // Allow preview for simplicity
      };
    }
  } catch (error) {
    console.error("Error fetching db material:", error);
  }
  return undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, materialId } = await params;
  const course = getCourseById(id);
  const material = await fetchMaterial(id, materialId);
  return {
    title: pageTitle(course && material ? `${course.title} - ${material.title}` : "Materi"),
    description: material?.title ?? "Materi course",
  };
}

export default async function CourseMaterialDetailPage({ params }: Props) {
  const { id, materialId } = await params;
  const course = getCourseById(id);
  const material = await fetchMaterial(id, materialId);
  if (!course || !material) notFound();

  const isEnrolled = await checkEnrollment(id);
  const isFree = material.isPastYear || material.isPreview;
  const isAccessible = isEnrolled || isFree;

  if (!isAccessible) {
    return (
      <CoursePageShell title="Materi terkunci" description={`${course.title} · konten premium`} hideHeader>
        <Reveal>
          <div className="rounded-lg border border-border/70 bg-card/75 p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border">
                <Lock className="size-5" />
              </div>
              <div>
                <h3 className="font-heading text-body-base font-bold text-foreground">Butuh token kelas</h3>
                <p className="mt-1 text-body-sm text-muted-foreground">
                  Aktifkan kelas untuk membuka &ldquo;{material.title}&rdquo;.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <EnrollmentForm />
            </div>
          </div>
        </Reveal>
      </CoursePageShell>
    );
  }

  return (
    <CoursePageShell title={material.title} description={`${course.title} · materi`} hideHeader>
      <Reveal>
        <MaterialViewer material={material} />
      </Reveal>
    </CoursePageShell>
  );
}
