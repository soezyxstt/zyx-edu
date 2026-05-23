import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { MaterialViewer } from "@/components/course/material-viewer";
import { pageTitle } from "@/lib/site";
import { getCourseById, getMaterial } from "@/lib/student-course-fixtures";
import { checkEnrollment } from "@/app/dashboard/actions";
import { EnrollmentForm } from "@/components/enrollment-form";
import { Reveal } from "@/components/ui/reveal";

type Props = { params: Promise<{ id: string; materialId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, materialId } = await params;
  const course = getCourseById(id);
  const material = getMaterial(id, materialId);
  return {
    title: pageTitle(course && material ? `${course.title} — ${material.title}` : "Materi"),
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
      <CoursePageShell title="Materi Terkunci" description={`${course.title} · konten premium`}>
        <Reveal>
          <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-md">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4 ring-1 ring-border">
              <Lock className="size-6" />
            </div>
            <h3 className="font-heading text-body-lg font-bold text-foreground">Konten Premium</h3>
            <p className="mt-2 text-body-sm text-muted-foreground leading-relaxed">
              Materi &ldquo;{material.title}&rdquo; adalah konten eksklusif kelas. Masukkan token pendaftaran Anda di bawah ini untuk membuka akses penuh.
            </p>
            <div className="mt-6 rounded-xl border border-border/85 bg-muted/40 p-5 text-left">
              <EnrollmentForm />
            </div>
          </div>
        </Reveal>
      </CoursePageShell>
    );
  }

  return (
    <CoursePageShell title={material.title} description={`${course.title} · materi pembelajaran`}>
      <Reveal>
        <MaterialViewer material={material} />
      </Reveal>
    </CoursePageShell>
  );
}
