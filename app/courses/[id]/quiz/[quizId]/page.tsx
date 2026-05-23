import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { checkEnrollment } from "@/app/dashboard/actions";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { QuizPlayer } from "@/components/course/quiz-player";
import { EnrollmentForm } from "@/components/enrollment-form";
import { Reveal } from "@/components/ui/reveal";
import { pageTitle } from "@/lib/site";
import { getCourseById, getExamById } from "@/lib/student-course-fixtures";

type Props = { params: Promise<{ id: string; quizId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, quizId } = await params;
  const course = getCourseById(id);
  const exam = getExamById(id, quizId);
  return {
    title: pageTitle(course && exam ? `${course.title} - ${exam.title}` : "Kuis"),
    description: exam?.title ?? "Kuis course",
  };
}

export default async function CourseQuizTakePage({ params }: Props) {
  const { id, quizId } = await params;
  const course = getCourseById(id);
  const exam = getExamById(id, quizId);
  if (!course || !exam || exam.type !== "quiz") notFound();

  const isEnrolled = await checkEnrollment(id);
  const isFree = exam.isPreview || exam.isPastYear;
  const isAccessible = isEnrolled || isFree;

  if (!isAccessible) {
    return (
      <CoursePageShell title="Kuis terkunci" description={`${course.title} · kuis premium`} hideHeader>
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
    <CoursePageShell title={exam.title} description="Jawab, submit, lalu lihat skor." hideHeader>
      <Reveal>
        <QuizPlayer courseId={id} exam={exam} />
      </Reveal>
    </CoursePageShell>
  );
}
