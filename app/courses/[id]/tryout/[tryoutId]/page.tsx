import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { checkEnrollment } from "@/app/dashboard/actions";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { TryoutForm } from "@/components/course/tryout-form";
import { EnrollmentForm } from "@/components/enrollment-form";
import { Reveal } from "@/components/ui/reveal";
import { pageTitle } from "@/lib/site";
// Fixture imports removed
import { getCourse } from "@/lib/course-utils";
import { db } from "@/db";
import { exams, questions } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";

type Props = { params: Promise<{ id: string; tryoutId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, tryoutId } = await params;
  const course = await getCourse(id);
  
  let examTitle = "Tryout";
  const [dbExam] = await db.select({ title: exams.title }).from(exams).where(eq(exams.id, tryoutId)).limit(1);
  if (dbExam) examTitle = dbExam.title;

  return {
    title: pageTitle(course ? `${course.title} - ${examTitle}` : "Tryout"),
    description: examTitle,
  };
}

export default async function CourseTryoutTakePage({ params }: Props) {
  const { id, tryoutId } = await params;
  const course = await getCourse(id);
  if (!course) notFound();

  let exam = null;
  const [dbExam] = await db
    .select()
    .from(exams)
    .where(and(eq(exams.id, tryoutId), eq(exams.courseId, id), eq(exams.type, "tryout")))
    .limit(1);

  if (dbExam) {
    const dbQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.examId, tryoutId))
      .orderBy(asc(questions.order));

    const settings = typeof dbExam.settings === "string" ? JSON.parse(dbExam.settings) : dbExam.settings;

    exam = {
      id: dbExam.id,
      courseId: id,
      title: dbExam.title,
      type: "tryout" as const,
      status: dbExam.status,
      settings: settings || { timeLimitMinutes: 90, maxAttempts: 2 },
      questions: dbQuestions.map((q) => {
        const content = typeof q.content === "string" ? JSON.parse(q.content) : q.content;
        return {
          id: q.id,
          order: q.order,
          type: q.type as any,
          prompt: content.prompt,
          options: content.options || [],
          correctIndex: content.correctIndex,
          correctIndices: content.correctIndices || [],
          acceptsImage: content.acceptsImage,
          acceptsFile: content.acceptsFile,
          acceptableAnswers: content.acceptableAnswers || [],
        };
      }),
    };
  }

  if (!exam || exam.type !== "tryout") notFound();

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
