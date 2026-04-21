import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ClipboardList } from "lucide-react";
import { ShellPage } from "@/components/shell-page";
import { Button } from "@/components/ui/button";
import { pageTitle } from "@/lib/site";
import {
  getCourseById,
  getExamsForCourse,
  getMaterialsForCourse,
} from "@/lib/student-course-fixtures";

export const metadata: Metadata = {
  title: pageTitle("Dashboard"),
  description: "Ringkasan progres belajar dan aktivitas di Zyx Edu.",
};

const HIGHLIGHT_COURSE_ID = "calc-1";

export default function DashboardPage() {
  const course = getCourseById(HIGHLIGHT_COURSE_ID);
  const materials = getMaterialsForCourse(HIGHLIGHT_COURSE_ID);
  const quizzes = getExamsForCourse(HIGHLIGHT_COURSE_ID, "quiz");
  const nextMaterial = materials.find((m) => !m.completed) ?? materials[0];
  const nextQuiz = quizzes[0];
  const doneCount = materials.filter((m) => m.completed).length;

  return (
    <ShellPage
      title="Dashboard"
      description="Ringkasan cepat (data contoh). Streak dan statistik nyata menyusul setelah backend progres aktif."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-brand-primary">
            <BookOpen className="size-5" aria-hidden />
            <h2 className="font-heading text-h6 font-semibold text-foreground">Lanjut belajar</h2>
          </div>
          {course && nextMaterial ? (
            <>
              <p className="mt-3 text-body-md text-muted-foreground">
                <span className="font-medium text-foreground">{course.title}</span> —{" "}
                {nextMaterial.title}
              </p>
              <p className="mt-1 text-body-sm text-muted-foreground">
                Materi {doneCount}/{materials.length} selesai (preview)
              </p>
              <Button asChild className="mt-5 rounded-full">
                <Link href={`/courses/${HIGHLIGHT_COURSE_ID}/material/${nextMaterial.id}`}>
                  Buka materi
                </Link>
              </Button>
            </>
          ) : (
            <p className="mt-3 text-body-md text-muted-foreground">Belum ada course aktif.</p>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-tertiary-1">
            <ClipboardList className="size-5" aria-hidden />
            <h2 className="font-heading text-h6 font-semibold text-foreground">Kuis berikutnya</h2>
          </div>
          {course && nextQuiz ? (
            <>
              <p className="mt-3 text-body-md text-muted-foreground">{nextQuiz.title}</p>
              <Button asChild variant="outline" className="mt-5 rounded-full">
                <Link href={`/courses/${HIGHLIGHT_COURSE_ID}/quiz/${nextQuiz.id}`}>Mulai</Link>
              </Button>
            </>
          ) : (
            <p className="mt-3 text-body-md text-muted-foreground">Tidak ada kuis terjadwal.</p>
          )}
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-6 text-center">
        <Link
          href="/courses"
          className="text-body-sm font-medium text-brand-primary underline-offset-4 hover:underline"
        >
          Lihat semua courses
        </Link>
      </div>
    </ShellPage>
  );
}
