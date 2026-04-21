import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ClipboardList, Trophy } from "lucide-react";
import { ShellPage } from "@/components/shell-page";
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

  return (
    <ShellPage
      title={course.title}
      description={course.description}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-brand-primary">
            <BookOpen className="size-5" aria-hidden />
            <h2 className="font-heading text-h6 font-semibold text-foreground">Materi</h2>
          </div>
          <p className="mt-2 text-body-base text-muted-foreground">
            {doneMaterials}/{materials.length} selesai (preview)
          </p>
          <Button asChild variant="outline" className="mt-4 w-full rounded-full sm:w-auto">
            <Link href={`/courses/${id}/material`}>Buka materi</Link>
          </Button>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-tertiary-1">
            <ClipboardList className="size-5" aria-hidden />
            <h2 className="font-heading text-h6 font-semibold text-foreground">Latihan</h2>
          </div>
          <p className="mt-2 text-body-base text-muted-foreground">
            {quizzes.length} kuis · {tryouts.length} tryout
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href={`/courses/${id}/quiz`}>Kuis</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href={`/courses/${id}/tryout`}>Tryout</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-brand-secondary">
            <Trophy className="size-5" aria-hidden />
            <h2 className="font-heading text-h6 font-semibold text-foreground">Progres</h2>
          </div>
          <p className="mt-2 text-body-base text-muted-foreground">
            Lihat peringkat dan riwayat pengumpulan.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href={`/courses/${id}/leaderboard`}>Papan peringkat</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href={`/courses/${id}/my-results`}>Hasil saya</Link>
            </Button>
          </div>
        </div>
      </div>
      <p className="mt-8 text-body-sm text-muted-foreground">
        Data pada halaman ini memakai contoh statis — akan tersambung ke enrollment dan progres nyata setelah API siap.
      </p>
    </ShellPage>
  );
}
