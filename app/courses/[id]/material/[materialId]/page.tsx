import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { checkEnrollment } from "@/app/dashboard/actions";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { MaterialViewer } from "@/components/course/material-viewer";
import { EnrollmentForm } from "@/components/enrollment-form";
import { Reveal } from "@/components/ui/reveal";
import { pageTitle } from "@/lib/site";
import { getCourseById, getMaterial } from "@/lib/student-course-fixtures";

type Props = { params: Promise<{ id: string; materialId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, materialId } = await params;
  const course = getCourseById(id);
  const material = getMaterial(id, materialId);
  return {
    title: pageTitle(course && material ? `${course.title} - ${material.title}` : "Materi"),
    description: material?.title ?? "Materi course",
  };
}

export default async function CourseMaterialDetailPage({ params }: Props) {
  const { id, materialId } = await params;
  const course = getCourseById(id);
  const material = getMaterial(id, materialId);
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
