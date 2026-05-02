import type { Metadata } from "next";
import Link from "next/link";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { courseCardClass } from "@/components/course/course-surfaces";
import { Button } from "@/components/ui/button";
import { pageTitle } from "@/lib/site";
import { getCourseById, getExamsForCourse } from "@/lib/student-course-fixtures";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const course = getCourseById(id);
  return {
    title: pageTitle(course ? `${course.title} — Kuis` : "Kuis"),
    description: "Daftar kuis course",
  };
}

const statusLabel: Record<string, string> = {
  draft: "Draf",
  published: "Berlangsung",
  ended: "Selesai",
};

export default async function CourseQuizListPage({ params }: Props) {
  const { id } = await params;
  const course = getCourseById(id);
  if (!course) return null;

  const quizzes = getExamsForCourse(id, "quiz");

  return (
    <CoursePageShell
      eyebrow="Latihan cepat"
      title="Kuis"
      description="Kuis interaktif bergaya ringan — pilih sesi dan mulai menjawab."
    >
      <ul className="grid gap-5 md:grid-cols-2">
        {quizzes.map((q) => (
          <li key={q.id} className={courseCardClass("flex flex-col")}>
            <h2 className="font-heading text-h6 font-semibold text-foreground">{q.title}</h2>
            <p className="mt-2 text-body-sm text-muted-foreground">
              {statusLabel[q.status] ?? q.status}
              {q.settings?.timeLimitMinutes != null ? ` · ${q.settings.timeLimitMinutes} menit` : ""}
              {q.settings?.maxAttempts != null ? ` · maks ${q.settings.maxAttempts} percobaan` : ""}
            </p>
            <p className="mt-1 text-body-sm text-muted-foreground">{q.questions.length} soal</p>
            {q.status === "published" ? (
              <Button
                asChild
                className="interactive mt-auto pt-6 rounded-full motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]"
              >
                <Link href={`/courses/${id}/quiz/${q.id}`}>Mulai kuis</Link>
              </Button>
            ) : (
              <Button type="button" className="mt-auto pt-6 rounded-full" disabled>
                Tidak tersedia
              </Button>
            )}
          </li>
        ))}
      </ul>
      {quizzes.length === 0 ? (
        <p className="text-body-md text-muted-foreground">Belum ada kuis.</p>
      ) : null}
    </CoursePageShell>
  );
}
