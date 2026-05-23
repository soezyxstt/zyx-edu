import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { checkEnrollment } from "@/app/dashboard/actions";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { TryoutForm } from "@/components/course/tryout-form";
import { EnrollmentForm } from "@/components/enrollment-form";
import { Reveal } from "@/components/ui/reveal";
import { pageTitle } from "@/lib/site";
import { getCourseById, getExamById } from "@/lib/student-course-fixtures";

type Props = { params: Promise<{ id: string; tryoutId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, tryoutId } = await params;
  const course = getCourseById(id);
  const exam = getExamById(id, tryoutId);
  return {
    title: pageTitle(course && exam ? `${course.title} - ${exam.title}` : "Tryout"),
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
      <CoursePageShell title="Tryout terkunci" description={`${course.title} · tryout premium`} hideHeader>
        <Reveal>
          <div className="rounded-lg border border-border/70 bg-card/75 p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border">
                <Lock className="size-5" />
              </div>
              <div>
                <h3 className="font-heading text-body-base font-bold text-foreground">Butuh token kelas</h3>
                <p className="mt-1 text-body-sm text-muted-foreground">
                  Aktifkan kelas untuk membuka &ldquo;{exam.title}&rdquo;.
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
    <CoursePageShell title={exam.title} description="Kerjakan sesuai waktu; esai dinilai pengajar." hideHeader>
      <Reveal>
        <TryoutForm courseId={id} exam={exam} />
      </Reveal>
    </CoursePageShell>
  );
}
