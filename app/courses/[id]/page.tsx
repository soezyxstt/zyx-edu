import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ClipboardList, Trophy, Lock } from "lucide-react";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { courseCardClass } from "@/components/course/course-surfaces";
import { Button } from "@/components/ui/button";
import { pageTitle } from "@/lib/site";
import {
  getCourseById,
  getExamsForCourse,
  getMaterialsForCourse,
} from "@/lib/student-course-fixtures";
import { checkEnrollment } from "@/app/dashboard/actions";
import { EnrollmentForm } from "@/components/enrollment-form";
import { DailyQuizSection } from "@/components/course/daily-quiz-section";
import { Reveal } from "@/components/ui/reveal";

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

  const materials = getMaterialsForCourse(id);
  const quizzes = getExamsForCourse(id, "quiz");
  const tryouts = getExamsForCourse(id, "tryout");
  
  // Count only materials completed in user data (not implemented fully in fixtures but keeps parity)
  const doneMaterials = materials.filter((m) => m.completed).length;

  const tiles = [
    {
      key: "material",
      icon: BookOpen,
      iconBg: "bg-brand-primary/12 text-brand-primary",
      title: "Dokumen & Materi",
      body: isEnrolled 
        ? `${doneMaterials}/${materials.length} dokumen dipelajari`
        : `Akses Terbuka: ${materials.length} dokumen (Materi, Soal ITB, Diktat) tersedia secara gratis`,
      actions: (
        <Button
          asChild
          variant="outline"
          className="interactive mt-4 w-full rounded-full motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98] sm:w-auto"
        >
          <Link href={`/courses/${id}/material`}>Buka dokumen</Link>
        </Button>
      ),
    },
    {
      key: "practice",
      icon: ClipboardList,
      iconBg: "bg-tertiary-1/12 text-tertiary-1",
      title: "Latihan & Tryout",
      body: isEnrolled 
        ? `${quizzes.length} kuis · ${tryouts.length} tryout`
        : `Pratinjau Kuis Gratis tersedia · ${tryouts.length} tryout membutuhkan pendaftaran`,
      actions: (
        <div className="mt-4 flex flex-wrap gap-2 w-full">
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
            variant={isEnrolled ? "outline" : "ghost"}
            disabled={!isEnrolled}
            size="sm"
            className="interactive rounded-full gap-1.5 motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]"
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
      title: "Papan Nilai",
      body: isEnrolled
        ? "Lihat peringkat dan riwayat pengumpulan nilai."
        : "Akses papan peringkat terkunci. Daftarkan kelas untuk bergabung.",
      actions: (
        <div className="mt-4 flex flex-wrap gap-2 w-full">
          <Button
            asChild
            variant={isEnrolled ? "outline" : "ghost"}
            disabled={!isEnrolled}
            size="sm"
            className="interactive rounded-full gap-1.5"
          >
            <Link href={`/courses/${id}/leaderboard`}>
              {!isEnrolled && <Lock className="size-3" />}
              Papan peringkat
            </Link>
          </Button>
          <Button
            asChild
            variant={isEnrolled ? "outline" : "ghost"}
            disabled={!isEnrolled}
            size="sm"
            className="interactive rounded-full gap-1.5"
          >
            <Link href={`/courses/${id}/my-results`}>
              {!isEnrolled && <Lock className="size-3" />}
              Hasil saya
            </Link>
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
      <Reveal>
        {!isEnrolled && (
          <div className="mb-8 rounded-2xl border border-brand-secondary/30 bg-brand-secondary/5 p-6 shadow-sm">
            <div className="flex items-start gap-4 flex-col md:flex-row justify-between md:items-center">
              <div className="space-y-1">
                <h3 className="font-heading text-body-base font-bold text-brand-secondary flex items-center gap-2">
                  Mode Pratinjau Gratis (Belum Terdaftar)
                </h3>
                <p className="text-body-sm text-muted-foreground max-w-2xl leading-relaxed">
                  Anda dapat mengakses seluruh Dokumen Materi secara gratis. Untuk membuka akses Kuis berbayar, Tryout Ujian, dan Papan Peringkat, silakan masukkan token pendaftaran satu kali pakai Anda.
                </p>
              </div>
              <div className="w-full md:w-auto shrink-0 md:max-w-md">
                <EnrollmentForm className="w-full" />
              </div>
            </div>
          </div>
        )}

        {/* Daily Quiz Pop-up mount and entry card banner */}
        <DailyQuizSection courseId={id} courseTitle={course.title} />

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
                <p className="mt-3 text-body-base text-muted-foreground flex-1">{t.body}</p>
                {t.actions}
              </div>
            );
          })}
        </div>
      </Reveal>
    </CoursePageShell>
  );
}
