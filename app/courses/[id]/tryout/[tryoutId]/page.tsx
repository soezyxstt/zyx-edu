import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { TryoutForm } from "@/components/course/tryout-form";
import { pageTitle } from "@/lib/site";
import { getCourseById, getExamById } from "@/lib/student-course-fixtures";
import { checkEnrollment } from "@/app/dashboard/actions";
import { EnrollmentForm } from "@/components/enrollment-form";
import { Reveal } from "@/components/ui/reveal";

type Props = { params: Promise<{ id: string; tryoutId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, tryoutId } = await params;
  const course = getCourseById(id);
  const exam = getExamById(id, tryoutId);
  return {
    title: pageTitle(course && exam ? `${course.title} — ${exam.title}` : "Tryout"),
    description: exam?.title ?? "Tryout course",
  };
}

export default async function CourseTryoutTakePage({ params }: Props) {
  const { id, tryoutId } = await params;
  const course = getCourseById(id);
  const exam = getExamById(id, tryoutId);
  if (!course || !exam || exam.type !== "tryout") notFound();

  const isEnrolled = await checkEnrollment(id);

  if (!isEnrolled) {
    return (
      <CoursePageShell title="Tryout Terkunci" description={`${course.title} · tryout premium`}>
        <Reveal>
          <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-md">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4 ring-1 ring-border">
              <Lock className="size-6" />
            </div>
            <h3 className="font-heading text-body-lg font-bold text-foreground">Tryout Premium</h3>
            <p className="mt-2 text-body-sm text-muted-foreground leading-relaxed">
              Simulasi Tryout &ldquo;{exam.title}&rdquo; adalah konten eksklusif kelas. Masukkan token pendaftaran Anda di bawah ini untuk membuka tryout ini beserta fitur kelas lainnya.
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
    <CoursePageShell
      title={exam.title}
      description="Isi semua bagian dengan teliti. Esai akan dinilai oleh pengajar."
    >
      <Reveal>
        <TryoutForm courseId={id} exam={exam} />
      </Reveal>
    </CoursePageShell>
  );
}
