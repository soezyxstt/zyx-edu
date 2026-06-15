import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { pageTitle } from "@/lib/site";
import { getCourseById, getMaterialsForCourse } from "@/lib/student-course-fixtures";
import { DocumentListClient } from "./document-list-client";
import { Reveal } from "@/components/ui/reveal";
import { db } from "@/db";
import { aiMaterialInstances, diktats } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const course = getCourseById(id);

  return {
    title: pageTitle(course ? `${course.title} - Materi` : "Materi"),
    description: "Materi belajar kelas.",
  };
}

export default async function CourseMaterialListPage({ params }: Props) {
  const { id } = await params;
  const course = getCourseById(id);
  if (!course) return null;

  // Fetch db-backed materials
  const dbMaterials = await db
    .select({
      id: aiMaterialInstances.id,
      title: aiMaterialInstances.title,
    })
    .from(aiMaterialInstances)
    .where(eq(aiMaterialInstances.courseId, id));

  // Fetch compiled diktats
  const courseDiktats = await db
    .select({
      id: diktats.id,
      title: diktats.title,
      fileUrl: diktats.fileUrl,
      updatedAt: diktats.updatedAt,
    })
    .from(diktats)
    .where(and(eq(diktats.courseId, id), eq(diktats.status, "ready")));

  const mappedDiktats = courseDiktats.map((d) => ({
    id: d.id,
    courseId: id,
    title: d.title,
    kind: "pdf" as const,
    docCategory: "diktat" as const,
    fileSize: "PDF File",
    completed: false,
    isPastYear: false,
    isPreview: true,
    url: d.fileUrl || undefined,
  }));

  const mappedDb = dbMaterials.map((m) => ({
    id: m.id,
    courseId: id,
    title: m.title.replace(/^\[DRAF\]\s*/, ""),
    kind: "article" as const,
    docCategory: "materi" as const,
    fileSize: "AI Generated",
    completed: false,
    isPastYear: false,
    isPreview: true, // Allow review without enrolling for simplicity
  }));

  const allMaterials = [...getMaterialsForCourse(id), ...mappedDiktats, ...mappedDb];


  return (
    <CoursePageShell>
      <Reveal>
        {courseDiktats.length > 0 && (
          <div className="mb-8 space-y-3 text-left">
            <h2 className="font-heading text-body-base font-bold text-foreground">Diktat Kuliah (PDF)</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {courseDiktats.map((d) => (
                <div key={d.id} className="flex flex-col justify-between rounded-2xl border border-border/60 bg-card/65 p-5 shadow-xs backdrop-blur-md">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-status-error/15 text-status-error">
                      <FileText className="size-5" />
                    </span>
                    <div>
                      <h3 className="font-heading text-body-sm font-bold text-foreground line-clamp-1">{d.title}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Dikompilasi otomatis dari materi terbaru</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground select-none">
                      Diperbarui: {new Date(d.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {d.fileUrl && (
                      <Button asChild size="xs" className="rounded-lg bg-gradient-to-r from-brand-secondary to-brand-secondary/90 hover:opacity-95 text-white font-semibold shadow-xs">
                        <a href={d.fileUrl} target="_blank" rel="noopener noreferrer">Unduh PDF</a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <DocumentListClient courseId={id} materials={allMaterials} />
      </Reveal>
    </CoursePageShell>
  );
}
