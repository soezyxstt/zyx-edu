import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ClipboardList, Lock, Trophy } from "lucide-react";
import { checkEnrollment, getDailyTrivia } from "@/app/dashboard/actions";
import { DailyQuizSection } from "@/components/course/daily-quiz-section";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { courseCardClass } from "@/components/course/course-surfaces";
import { EnrollmentForm } from "@/components/enrollment-form";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
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

  const isEnrolled = await checkEnrollment(id);
  const dailyTrivia = await getDailyTrivia(id);
  const materials = getMaterialsForCourse(id);
  const quizzes = getExamsForCourse(id, "quiz");
  const tryouts = getExamsForCourse(id, "tryout");
  const doneMaterials = materials.filter((m) => m.completed).length;

  const tiles = [
    {
      key: "material",
      icon: BookOpen,
      iconBg: "bg-brand-primary/12 text-brand-primary",
      title: "Dokumen",
      body: isEnrolled ? `${doneMaterials}/${materials.length} dipelajari` : `${materials.length} dokumen gratis`,
      actions: (
        <Button asChild variant="outline" size="sm" className="interactive rounded-md">
          <Link href={`/courses/${id}/material`}>Buka</Link>
        </Button>
      ),
    },
    {
      key: "practice",
      icon: ClipboardList,
      iconBg: "bg-tertiary-1/12 text-tertiary-1",
      title: "Latihan",
      body: isEnrolled ? `${quizzes.length} kuis, ${tryouts.length} tryout` : "Kuis gratis, tryout via token",
      actions: (
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="interactive rounded-md">
            <Link href={`/courses/${id}/quiz`}>Kuis</Link>
          </Button>
          <Button
            asChild
            variant={isEnrolled ? "outline" : "ghost"}
            disabled={!isEnrolled}
            size="sm"
            className="interactive gap-1.5 rounded-md"
          >
            <Link href={`/courses/${id}/tryout`}>
              {!isEnrolled && <Lock className="size-3 text-muted-foreground" />}
              Tryout
            </Link>
          </Button>
        </div>
      ),
    },
    {
      key: "progress",
      icon: Trophy,
      iconBg: "bg-brand-secondary/12 text-brand-secondary",
      title: "Nilai",
      body: isEnrolled ? "Peringkat dan riwayat." : "Terkunci sampai aktif.",
      actions: (
        <div className="flex flex-wrap gap-2">
          <Button
            asChild
            variant={isEnrolled ? "outline" : "ghost"}
            disabled={!isEnrolled}
            size="sm"
            className="interactive gap-1.5 rounded-md"
          >
            <Link href={`/courses/${id}/leaderboard`}>
              {!isEnrolled && <Lock className="size-3" />}
              Peringkat
            </Link>
          </Button>
          <Button
            asChild
            variant={isEnrolled ? "outline" : "ghost"}
            disabled={!isEnrolled}
            size="sm"
            className="interactive gap-1.5 rounded-md"
          >
            <Link href={`/courses/${id}/my-results`}>
              {!isEnrolled && <Lock className="size-3" />}
              Hasil
            </Link>
          </Button>
        </div>
      ),
    },
  ] as const;

  return (
    <CoursePageShell>
      <Reveal>
        {!isEnrolled && (
          <div className="mb-5 rounded-lg border border-brand-secondary/25 bg-brand-secondary/5 p-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] md:items-center">
              <div>
                <h3 className="font-heading text-body-base font-bold text-brand-secondary">Pratinjau gratis</h3>
                <p className="mt-1 max-w-2xl text-body-sm text-muted-foreground">
                  Dokumen terbuka. Token membuka kuis premium, tryout, peringkat, dan riwayat nilai.
                </p>
              </div>
              <EnrollmentForm className="w-full" />
            </div>
          </div>
        )}

        <DailyQuizSection courseId={id} courseTitle={course.title} dailyTrivia={dailyTrivia} />

        <div className="grid gap-3 md:grid-cols-3">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <div key={tile.key} className={courseCardClass("flex flex-col gap-3")}>
                <div className="flex items-center gap-2.5">
                  <span className={`flex size-9 items-center justify-center rounded-lg ${tile.iconBg}`} aria-hidden>
                    <Icon className="size-4" />
                  </span>
                  <h2 className="font-heading text-h6 font-semibold text-foreground">{tile.title}</h2>
                </div>
                <p className="text-body-sm text-muted-foreground">{tile.body}</p>
                {tile.actions}
              </div>
            );
          })}
        </div>
      </Reveal>
    </CoursePageShell>
  );
}
