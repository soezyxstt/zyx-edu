import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ClipboardList, Trophy } from "lucide-react";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { courseCardClass } from "@/components/course/course-surfaces";
import { Button } from "@/components/ui/button";
import { pageTitle } from "@/lib/site";
import {
  getCourseById,
  getExamsForCourse,
  getMaterialsForCourse,
} from "@/lib/student-course-fixtures";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const course = getCourseById(id);
  return {
    title: pageTitle(course ? course.title : "Course"),
    description: course?.description ?? "Course overview",
  };
}

export default async function CourseOverviewPage({ params }: Props) {
  const { id } = await params;
  const course = getCourseById(id);
  if (!course) return null;

  const materials = getMaterialsForCourse(id);
  const quizzes = getExamsForCourse(id, "quiz");
  const tryouts = getExamsForCourse(id, "tryout");
  const doneMaterials = materials.filter((m) => m.completed).length;

  const tiles = [
    {
      key: "material",
      icon: BookOpen,
      iconBg: "bg-brand-primary/12 text-brand-primary",
      title: "Materi",
      body: `${doneMaterials}/${materials.length} selesai (preview)`,
      actions: (
        <Button
          asChild
          variant="outline"
          className="interactive mt-4 w-full rounded-full motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98] sm:w-auto"
        >
          <Link href={`/courses/${id}/material`}>Buka materi</Link>
        </Button>
      ),
    },
    {
      key: "practice",
      icon: ClipboardList,
      iconBg: "bg-tertiary-1/12 text-tertiary-1",
      title: "Latihan",
      body: `${quizzes.length} kuis · ${tryouts.length} tryout`,
      actions: (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="interactive rounded-full motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]"
          >
            <Link href={`/courses/${id}/quiz`}>Kuis</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="interactive rounded-full motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]"
          >
            <Link href={`/courses/${id}/tryout`}>Tryout</Link>
          </Button>
        </div>
      ),
    },
    {
      key: "progress",
      icon: Trophy,
      iconBg: "bg-brand-secondary/12 text-brand-secondary",
      title: "Progres",
      body: "Lihat peringkat dan riwayat pengumpulan.",
      actions: (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="interactive rounded-full motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]"
          >
            <Link href={`/courses/${id}/leaderboard`}>Papan peringkat</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="interactive rounded-full motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]"
          >
            <Link href={`/courses/${id}/my-results`}>Hasil saya</Link>
          </Button>
        </div>
      ),
    },
  ] as const;

  return (
    <CoursePageShell
      eyebrow={course.category}
      headingTier="primary"
      title={course.title}
      description={course.description}
    >
      <div className="grid gap-5 md:grid-cols-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.key} className={courseCardClass("flex flex-col")}>
              <div className="flex items-center gap-3">
                <span
                  className={`flex size-11 items-center justify-center rounded-2xl ${t.iconBg}`}
                  aria-hidden
                >
                  <Icon className="size-5" />
                </span>
                <h2 className="font-heading text-h6 font-semibold text-foreground">{t.title}</h2>
              </div>
              <p className="mt-3 text-body-base text-muted-foreground">{t.body}</p>
              {t.actions}
            </div>
          );
        })}
      </div>
      <p className="mt-10 text-body-sm text-muted-foreground">
        Data pada halaman ini memakai contoh statis — akan tersambung ke enrollment dan progres nyata
        setelah API siap.
      </p>
    </CoursePageShell>
  );
}
