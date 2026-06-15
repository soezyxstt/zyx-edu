import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  ClipboardList,
  Trophy,
  Lock,
  FileText,
  BarChart3,
  CheckCircle2,
  Star,
  ArrowRight,
  Target,
} from "lucide-react";
import { checkEnrollment, getDailyTrivia } from "@/app/dashboard/actions";
import { DailyQuizSection } from "@/components/course/daily-quiz-section";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { EnrollmentForm } from "@/components/enrollment-form";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { pageTitle } from "@/lib/site";
import {
  getCourseById,
  getExamsForCourse,
  getMaterialsForCourse,
  getSubmissionsForCourse,
  getLeaderboard,
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

  // ── data ──────────────────────────────────────────────────────────────────
  const materials = getMaterialsForCourse(id);
  const quizzes = getExamsForCourse(id, "quiz");
  const tryouts = getExamsForCourse(id, "tryout");
  const submissions = getSubmissionsForCourse(id);

  const doneMaterials = materials.filter((m) => m.completed).length;
  const quizSubs = submissions.filter((s) => s.examType === "quiz" && s.score !== null);
  const tryoutSubs = submissions.filter((s) => s.examType === "tryout" && s.score !== null);
  const bestQuizScore = quizSubs.length > 0 ? Math.max(...quizSubs.map((s) => s.score as number)) : null;
  const bestTryoutScore = tryoutSubs.length > 0 ? Math.max(...tryoutSubs.map((s) => s.score as number)) : null;

  // Leaderboard rank — fixtures use "u-demo" for the current demo user
  const leaderboard = getLeaderboard(id);
  const myRank = leaderboard.find((e) => e.userId === "u-demo")?.rank ?? null;

  // Progress percentage
  const progressPct = materials.length > 0 ? Math.round((doneMaterials / materials.length) * 100) : 0;

  // ── description (trimmed) ─────────────────────────────────────────────────
  // Strip the dash-separated suffix list from the description copy
  const shortDescription = course.description.split(" - ")[0];

  return (
    <CoursePageShell title={course.title} description={shortDescription} icon={BookOpen}>
      <Reveal>
        {/* ── Enrollment banner (unenrolled only) ─────────────────────────── */}
        {!isEnrolled && (
          <div className="mb-6 rounded-lg border border-brand-secondary/25 bg-brand-secondary/5 p-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] md:items-center">
              <div>
                <h3 className="font-heading text-body-base font-bold text-brand-secondary">
                  Pratinjau gratis
                </h3>
                <p className="mt-1 max-w-2xl text-body-sm text-muted-foreground">
                  Dokumen terbuka. Token membuka kuis premium, tryout, peringkat, dan riwayat nilai.
                </p>
              </div>
              <EnrollmentForm className="w-full" />
            </div>
          </div>
        )}

        {/* ── Progress stats strip (enrolled only) ────────────────────────── */}
        {isEnrolled && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Materials progress */}
            <div className="rounded-xl border border-border/60 bg-card/65 p-4 shadow-xs backdrop-blur-md">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="size-4 shrink-0 text-brand-primary" aria-hidden />
                <span className="text-body-sm font-medium">Dokumen</span>
              </div>
              <p className="mt-2 font-heading text-h5 font-semibold text-foreground">
                {doneMaterials}
                <span className="text-body-base font-normal text-muted-foreground">
                  /{materials.length}
                </span>
              </p>
              {/* Progress bar */}
              <div className="mt-2 h-1 w-full overflow-hidden rounded-md bg-muted">
                <div
                  className="h-full rounded-md bg-brand-primary transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                  aria-label={`${progressPct}% selesai`}
                />
              </div>
              <p className="mt-1 text-body-sm text-muted-foreground">{progressPct}% selesai</p>
            </div>

            {/* Best quiz score */}
            <div className="rounded-xl border border-border/60 bg-card/65 p-4 shadow-xs backdrop-blur-md">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ClipboardList className="size-4 shrink-0 text-tertiary-1" aria-hidden />
                <span className="text-body-sm font-medium">Kuis Terbaik</span>
              </div>
              {bestQuizScore !== null ? (
                <>
                  <p className="mt-2 font-heading text-h5 font-semibold text-foreground">
                    {bestQuizScore}
                    <span className="text-body-base font-normal text-muted-foreground">/100</span>
                  </p>
                  <p className="mt-1 text-body-sm text-muted-foreground">
                    {quizSubs.length} pengerjaan
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 font-heading text-h5 font-semibold text-muted-foreground">—</p>
                  <p className="mt-1 text-body-sm text-muted-foreground">Belum dikerjakan</p>
                </>
              )}
            </div>

            {/* Tryout score */}
            <div className="rounded-xl border border-border/60 bg-card/65 p-4 shadow-xs backdrop-blur-md">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="size-4 shrink-0 text-brand-secondary" aria-hidden />
                <span className="text-body-sm font-medium">Tryout</span>
              </div>
              {bestTryoutScore !== null ? (
                <>
                  <p className="mt-2 font-heading text-h5 font-semibold text-foreground">
                    {bestTryoutScore}
                    <span className="text-body-base font-normal text-muted-foreground">/100</span>
                  </p>
                  <p className="mt-1 text-body-sm text-muted-foreground">
                    {tryoutSubs.length} pengerjaan
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 font-heading text-h5 font-semibold text-muted-foreground">—</p>
                  <p className="mt-1 text-body-sm text-muted-foreground">Belum dikerjakan</p>
                </>
              )}
            </div>

            {/* Leaderboard rank */}
            <div className="rounded-xl border border-border/60 bg-card/65 p-4 shadow-xs backdrop-blur-md">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Trophy className="size-4 shrink-0 text-yellow-500" aria-hidden />
                <span className="text-body-sm font-medium">Peringkat</span>
              </div>
              {myRank !== null ? (
                <>
                  <p className="mt-2 font-heading text-h5 font-semibold text-foreground">
                    #{myRank}
                  </p>
                  <p className="mt-1 text-body-sm text-muted-foreground">
                    dari {leaderboard.length} siswa
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 font-heading text-h5 font-semibold text-muted-foreground">—</p>
                  <p className="mt-1 text-body-sm text-muted-foreground">Belum ada skor</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Compact nav tiles ────────────────────────────────────────────── */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Dokumen */}
          <Link
            href={`/courses/${id}/material`}
            id="nav-tile-material"
            className="group flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/65 px-4 py-3.5 shadow-xs backdrop-blur-md transition-all duration-200 hover:border-brand-primary/35 hover:bg-card hover:shadow-sm"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary/12 text-brand-primary">
                <FileText className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-body-sm font-semibold text-foreground">Dokumen</p>
                <p className="text-body-sm text-muted-foreground">
                  {isEnrolled
                    ? `${doneMaterials}/${materials.length} dipelajari`
                    : `${materials.length} dokumen tersedia`}
                </p>
              </div>
            </div>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-primary" aria-hidden />
          </Link>

          {/* Kuis */}
          <Link
            href={`/courses/${id}/quiz`}
            id="nav-tile-quiz"
            className="group flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/65 px-4 py-3.5 shadow-xs backdrop-blur-md transition-all duration-200 hover:border-tertiary-1/35 hover:bg-card hover:shadow-sm"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tertiary-1/12 text-tertiary-1">
                <ClipboardList className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-body-sm font-semibold text-foreground">Kuis</p>
                <p className="text-body-sm text-muted-foreground">
                  {quizzes.length} kuis tersedia
                </p>
              </div>
            </div>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-tertiary-1" aria-hidden />
          </Link>

          {/* Tryout */}
          {isEnrolled ? (
            <Link
              href={`/courses/${id}/tryout`}
              id="nav-tile-tryout"
              className="group flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/65 px-4 py-3.5 shadow-xs backdrop-blur-md transition-all duration-200 hover:border-brand-secondary/35 hover:bg-card hover:shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-secondary/12 text-brand-secondary">
                  <BarChart3 className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-body-sm font-semibold text-foreground">Tryout</p>
                  <p className="text-body-sm text-muted-foreground">
                    {tryouts.length} tryout tersedia
                  </p>
                </div>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-secondary" aria-hidden />
            </Link>
          ) : (
            <div
              id="nav-tile-tryout-locked"
              className="flex items-center justify-between gap-4 rounded-xl border border-border/40 bg-muted/30 px-4 py-3.5 opacity-60"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Lock className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-body-sm font-semibold text-foreground">Tryout</p>
                  <p className="text-body-sm text-muted-foreground">Perlu token aktif</p>
                </div>
              </div>
              <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </div>
          )}

          {/* Peringkat */}
          {isEnrolled ? (
            <Link
              href={`/courses/${id}/leaderboard`}
              id="nav-tile-leaderboard"
              className="group flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/65 px-4 py-3.5 shadow-xs backdrop-blur-md transition-all duration-200 hover:border-yellow-500/35 hover:bg-card hover:shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                  <Trophy className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-body-sm font-semibold text-foreground">Peringkat</p>
                  <p className="text-body-sm text-muted-foreground">
                    {myRank !== null ? `Kamu #${myRank}` : "Lihat papan skor"}
                  </p>
                </div>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-yellow-600 dark:group-hover:text-yellow-400" aria-hidden />
            </Link>
          ) : (
            <div
              id="nav-tile-leaderboard-locked"
              className="flex items-center justify-between gap-4 rounded-xl border border-border/40 bg-muted/30 px-4 py-3.5 opacity-60"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Lock className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-body-sm font-semibold text-foreground">Peringkat</p>
                  <p className="text-body-sm text-muted-foreground">Perlu token aktif</p>
                </div>
              </div>
              <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </div>
          )}

          {/* Hasil / My Results */}
          {isEnrolled ? (
            <Link
              href={`/courses/${id}/my-results`}
              id="nav-tile-results"
              className="group flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/65 px-4 py-3.5 shadow-xs backdrop-blur-md transition-all duration-200 hover:border-brand-primary/35 hover:bg-card hover:shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary/12 text-brand-primary">
                  <Star className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-body-sm font-semibold text-foreground">Riwayat Nilai</p>
                  <p className="text-body-sm text-muted-foreground">
                    {submissions.length > 0
                      ? `${submissions.length} pengerjaan tercatat`
                      : "Belum ada nilai — kerjakan kuis pertama"}
                  </p>
                </div>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-primary" aria-hidden />
            </Link>
          ) : (
            <div
              id="nav-tile-results-locked"
              className="flex items-center justify-between gap-4 rounded-xl border border-border/40 bg-muted/30 px-4 py-3.5 opacity-60"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Lock className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-body-sm font-semibold text-foreground">Riwayat Nilai</p>
                  <p className="text-body-sm text-muted-foreground">Perlu token aktif</p>
                </div>
              </div>
              <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </div>
          )}

          {/* Flashcard */}
          <Link
            href={`/courses/${id}/flashcard`}
            id="nav-tile-flashcard"
            className="group flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/65 px-4 py-3.5 shadow-xs backdrop-blur-md transition-all duration-200 hover:border-tertiary-3/35 hover:bg-card hover:shadow-sm"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tertiary-3/12 text-tertiary-3">
                <CheckCircle2 className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-body-sm font-semibold text-foreground">Flashcard</p>
                <p className="text-body-sm text-muted-foreground">Hafal dengan spaced repetition</p>
              </div>
            </div>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-tertiary-3" aria-hidden />
          </Link>
        </div>

        {/* ── Trivia Harian (demoted, below the fold content) ─────────────── */}
        <DailyQuizSection courseId={id} courseTitle={course.title} dailyTrivia={dailyTrivia} />
      </Reveal>
    </CoursePageShell>
  );
}
