import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import {
  ClipboardList,
  GraduationCap,
  Play,
  CheckCircle2,
  Bookmark,
  Trophy,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageTitle } from "@/lib/site";
import { EnrollmentForm } from "@/components/enrollment-form";
import { CoursesAmbient } from "@/components/course/courses-ambient";
import { Reveal } from "@/components/ui/reveal";
import { auth } from "@/lib/auth";
import {
  getStudentEnrollments,
  getMaterialsProgress,
  getStudentSubmissions,
} from "@/app/dashboard/actions";
import { getMaterialsForCourse, getExamsForCourse } from "@/lib/student-course-fixtures";
import { DashboardWeakConcepts } from "@/components/course/dashboard-weak-concepts";
import { TodayPlan } from "@/components/dashboard/today-plan";
import { env } from "@/lib/env";
import { getMastery } from "@/lib/mastery-store";
import { InterventionBanner } from "@/components/dashboard/intervention-banner";
import { db } from "@/db";
import { weeklyReflections } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { WeeklyReflection } from "@/components/dashboard/weekly-reflection";


export const metadata: Metadata = {
  title: pageTitle("Dashboard Siswa"),
  description: "Selamat datang di ruang belajar personal Anda.",
};

export default async function DashboardPage() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  const user = session?.user;
  const userName = user?.name || "Siswa";

  const featureToday = env.FEATURE_TODAY === "1";
  const firstName = userName.split(" ")[0];

  const enrollments = await getStudentEnrollments();
  const progressList = await getMaterialsProgress();
  const submissionsList = await getStudentSubmissions();

  // Fetch latest weekly reflection if feature is enabled
  let latestReflection = null;
  if (user?.id && env.FEATURE_REFLECTION === "1") {
    try {
      const rows = await db
        .select()
        .from(weeklyReflections)
        .where(eq(weeklyReflections.studentId, user.id))
        .orderBy(desc(weeklyReflections.weekStart))
        .limit(1);

      if (rows[0]) {
        latestReflection = {
          ...rows[0],
          createdAt: rows[0].createdAt.toISOString(),
        };
      }
    } catch (e) {
      console.error("Error loading weekly reflection:", e);
    }
  }


  // Fetch weak concepts
  let masteryConcepts: Awaited<ReturnType<typeof getMastery>> = [];
  if (user?.id && env.FEATURE_MASTERY === "1") {
    try {
      const firstCourseId = (await getStudentEnrollments())[0]?.id;
      if (firstCourseId) {
        masteryConcepts = await getMastery(user.id, firstCourseId);
      }
    } catch (e) {
      console.error("Error loading mastery concepts:", e);
    }
  }

  // Fetch next concepts from study paths
  const nextConcepts: Record<string, string> = {};
  if (user?.id && env.FEATURE_STUDY_PATH === "1") {
    try {
      const { getOrComputeStudyPath } = await import("@/lib/study-path-service");
      await Promise.all(
        enrollments.map(async (course) => {
          const path = await getOrComputeStudyPath(user.id, course.id);
          const activeStep = path.find(
            (step) => step.status === "available" || step.status === "in_progress"
          );
          if (activeStep) {
            nextConcepts[course.id] = activeStep.conceptName;
          }
        })
      );
    } catch (e) {
      console.error("Error loading next concepts for dashboard:", e);
    }
  }

  const isEnrolledInAny = enrollments.length > 0;
  const enrolledCourseIds = enrollments.map((e) => e.id);

  // 1. In-progress documents (materials)
  const inProgressRecords = progressList.filter((p) => p.status === "in_progress");
  const inProgressDocuments = inProgressRecords
    .map((record) => {
      for (const courseId of enrolledCourseIds) {
        const materials = getMaterialsForCourse(courseId);
        const mat = materials.find((m) => m.id === record.materialId);
        if (mat) {
          const course = enrollments.find((e) => e.id === courseId);
          return {
            ...mat,
            courseTitle: course?.title || "Course",
            courseId,
          };
        }
      }
      return null;
    })
    .filter((document) => document !== null);

  // 2. Available exams
  const availableExams = enrolledCourseIds.flatMap((courseId) => {
    const course = enrollments.find((e) => e.id === courseId);
    const quizzes = getExamsForCourse(courseId, "quiz");
    const tryouts = getExamsForCourse(courseId, "tryout");
    const allCourseExams = [...quizzes, ...tryouts];

    return allCourseExams
      .filter((exam) => {
        const alreadySubmitted = submissionsList.some(
          (sub) => sub.examId === exam.id && sub.status !== "pending_review"
        );
        return !alreadySubmitted;
      })
      .map((exam) => ({
        ...exam,
        courseTitle: course?.title || "Course",
        courseId,
      }));
  });

  return (
    <div className="pb-16 pt-8 md:pt-12">
      <div className="marketing-container">
        {env.FEATURE_FEEDBACK === "1" && user?.id && <InterventionBanner />}
        {env.FEATURE_REFLECTION === "1" && latestReflection && (
          <WeeklyReflection reflection={latestReflection} />
        )}
        {featureToday && user?.id ? (
          <TodayPlan firstName={firstName} />
        ) : (
          /* Welcome Header (shown when FEATURE_TODAY is off) */
          <Reveal duration="duration-500">
            <header className="mx-auto mb-10 max-w-4xl text-center">
              <h1 className="font-heading text-h3 font-bold text-foreground md:text-h2">
                Halo, <span className="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">{userName}</span>! 👋
              </h1>
              <p className="mt-1.5 text-body-base text-muted-foreground">
                Mari lanjutkan aktivitas belajarmu hari ini.
              </p>
            </header>
          </Reveal>
        )}

        <Reveal duration="duration-700">
        {!isEnrolledInAny ? (
          /* Empty State: Step-by-step clean portal */
          <div className="mx-auto max-w-2xl rounded-3xl border border-border/60 bg-card/65 p-8 text-center shadow-md backdrop-blur-md md:p-12">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary ring-4 ring-brand-primary/5">
              <GraduationCap className="size-8" />
            </div>
            <h2 className="mt-6 font-heading text-h4 font-bold text-foreground">
              Mulai Perjalanan Belajarmu
            </h2>
            <p className="mt-2 text-body-base text-muted-foreground max-w-md mx-auto leading-relaxed">
              Aktifkan kelas Anda menggunakan token pendaftaran satu kali pakai yang diberikan oleh admin/dosen.
            </p>

            {/* Steps indicator */}
            <div className="mt-8 grid gap-4 grid-cols-3 text-left">
              <div className="rounded-xl bg-muted/40 p-4 border border-border/40">
                <span className="flex size-6 items-center justify-center rounded-full bg-brand-primary text-white font-heading text-body-xs font-bold">1</span>
                <h4 className="mt-2 text-body-xs font-bold text-foreground">Buat Akun</h4>
                <p className="text-body-2xs text-muted-foreground mt-0.5">Sudah aktif via Google</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-4 border border-border/40">
                <span className="flex size-6 items-center justify-center rounded-full bg-brand-primary text-white font-heading text-body-xs font-bold">2</span>
                <h4 className="mt-2 text-body-xs font-bold text-foreground">Token Unik</h4>
                <p className="text-body-2xs text-muted-foreground mt-0.5">Minta pada dosen/admin</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-4 border border-border/40">
                <span className="flex size-6 items-center justify-center rounded-full bg-brand-primary text-white font-heading text-body-xs font-bold">3</span>
                <h4 className="mt-2 text-body-xs font-bold text-foreground">Aktivasi</h4>
                <p className="text-body-2xs text-muted-foreground mt-0.5">Masukkan di form bawah</p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-border/60 bg-gradient-to-br from-brand-primary/5 via-transparent to-tertiary-3/5 p-6 text-left shadow-xs">
              <h3 className="font-heading text-body-sm font-bold text-foreground mb-1">
                Masukkan Kode Aktivasi
              </h3>
              <p className="text-body-xs text-muted-foreground mb-4">
                Satu token berlaku untuk satu mata kuliah selama satu semester.
              </p>
              <EnrollmentForm />
            </div>
          </div>
        ) : (
          /* Active Student Dashboard Flow */
          <div className="grid gap-5 lg:grid-cols-12">
            {/* Left Column (Main study track) - 7 cols */}
            <div className="space-y-5 lg:col-span-7">
              {/* Classes list Section */}
              <div className="rounded-2xl border border-border/60 bg-card/65 p-5 shadow-xs backdrop-blur-md">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-heading text-body-base font-semibold text-foreground flex items-center gap-2">
                    <GraduationCap className="size-4 text-brand-primary" />
                    Kelas Aktif
                  </h2>
                  <Link href="/courses" className="text-body-xs font-semibold text-brand-secondary hover:underline flex items-center gap-0.5">
                    Lihat Semua
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>

                <div className="space-y-3">
                  {enrollments.map((course) => {
                    const materials = getMaterialsForCourse(course.id);
                    const courseCompletedIds = progressList
                      .filter((p) => p.status === "completed")
                      .map((p) => p.materialId);
                    const doneCount = materials.filter((m) => courseCompletedIds.includes(m.id)).length;
                    const progressPct = materials.length > 0 ? Math.round((doneCount / materials.length) * 100) : 0;

                    return (
                      <div
                        key={course.id}
                        className="flex flex-col gap-3 rounded-xl border border-border/40 bg-muted/20 p-4 transition-all duration-200 hover:border-brand-primary/35 hover:bg-muted/40 md:flex-row md:items-center justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="inline-flex rounded-md border border-brand-primary/20 bg-brand-primary/5 px-2 py-0.5 text-body-2xs font-semibold text-brand-primary">
                            {course.category}
                          </span>
                          <h3 className="mt-1.5 font-heading text-body-base font-semibold text-foreground truncate">
                            {course.title}
                          </h3>
                          
                          {/* Sleek inline progress */}
                          <div className="mt-2.5 flex items-center gap-3 max-w-xs">
                            <div className="h-1 flex-1 overflow-hidden rounded bg-muted/60">
                              <div
                                className="h-full bg-brand-primary transition-all duration-300"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <span className="text-body-xs text-muted-foreground shrink-0">{progressPct}%</span>
                          </div>

                          {env.FEATURE_STUDY_PATH === "1" && nextConcepts[course.id] && (
                            <div className="mt-2.5">
                              <Link
                                href={`/courses/${course.id}/path`}
                                className="text-body-sm text-primary font-medium hover:underline"
                              >
                                Continue: {nextConcepts[course.id]}
                              </Link>
                            </div>
                          )}
                        </div>

                        <Button asChild size="sm" variant="outline" className="rounded-md shrink-0">
                          <Link href={`/courses/${course.id}`}>Buka Kelas</Link>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Documents In Progress ("sedang dibaca tetapi belum selesai") */}
              <div className="rounded-2xl border border-border/60 bg-card/65 p-5 shadow-xs backdrop-blur-md">
                <h2 className="font-heading text-body-base font-semibold text-foreground flex items-center gap-2 mb-4">
                  <Bookmark className="size-4 text-brand-secondary" />
                  Materi Terbuka (Belum Selesai)
                </h2>
                {inProgressDocuments.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {inProgressDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex flex-col justify-between rounded-xl border border-border/40 bg-muted/20 p-4 hover:border-brand-primary/35 hover:bg-muted/40 transition-all duration-200"
                      >
                        <div className="min-w-0">
                          <span className="inline-flex rounded-md border border-border/50 bg-muted/30 px-2 py-0.5 text-body-2xs font-semibold text-muted-foreground">
                            {doc.courseTitle}
                          </span>
                          <h4 className="font-heading text-body-sm font-semibold text-foreground mt-2 line-clamp-1">
                            {doc.title}
                          </h4>
                          <p className="text-body-2xs text-muted-foreground mt-0.5 capitalize">
                            {doc.kind}
                          </p>
                        </div>
                        <Button asChild size="xs" variant="outline" className="mt-4 w-fit rounded-md gap-1">
                          <Link href={`/courses/${doc.courseId}/material/${doc.id}`}>
                            <Play className="size-2.5 fill-current" />
                            Lanjutkan
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-7 text-center rounded-xl border border-dashed border-border/60">
                    <CheckCircle2 className="size-6 text-muted-foreground/40 mb-2" />
                    <p className="text-body-sm text-muted-foreground">Semua dokumen telah selesai dibaca!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (Activities & Task list) - 5 cols */}
            <div className="space-y-5 lg:col-span-5">
              <DashboardWeakConcepts concepts={masteryConcepts} />
              
              {/* Quizzes and Tryouts */}
              <div className="rounded-2xl border border-border/60 bg-card/65 p-5 shadow-xs backdrop-blur-md">
                <h2 className="font-heading text-body-base font-semibold text-foreground flex items-center gap-2 mb-4">
                  <ClipboardList className="size-4 text-tertiary-1" />
                  Kuis & Tryout Tersedia
                </h2>
                {availableExams.length > 0 ? (
                  <ul className="space-y-2.5">
                    {availableExams.map((exam) => (
                      <li
                        key={exam.id}
                        className="flex items-center justify-between gap-4 rounded-xl border border-border/40 bg-muted/20 p-3.5 hover:border-brand-primary/35 hover:bg-muted/40 transition-all duration-200"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="font-heading text-body-sm font-semibold text-foreground truncate">
                            {exam.title}
                          </h4>
                          <p className="text-body-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            <span className="text-brand-primary">{exam.courseTitle}</span>
                            <span>·</span>
                            <span className="capitalize">{exam.type}</span>
                          </p>
                        </div>
                        <Button asChild size="sm" className="rounded-md shrink-0">
                          <Link href={`/courses/${exam.courseId}/${exam.type}/${exam.id}`}>
                            Kerjakan
                          </Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center py-7 text-center rounded-xl border border-dashed border-border/60">
                    <Trophy className="size-6 text-brand-secondary/60 mb-2" />
                    <p className="text-body-sm text-muted-foreground">Semua ujian telah selesai.</p>
                  </div>
                )}
              </div>

              {/* Activation box (Token form) */}
              <div className="rounded-2xl border border-border/60 bg-card/65 p-5 shadow-xs backdrop-blur-md">
                <h3 className="font-heading text-body-base font-semibold text-foreground">
                  Aktivasi Kelas Tambahan
                </h3>
                <p className="text-body-xs text-muted-foreground mt-1 mb-4 leading-relaxed">
                  Masukkan token pendaftaran untuk mengaktifkan kelas baru.
                </p>
                <EnrollmentForm />
              </div>
            </div>
          </div>
        )}
        </Reveal>
      </div>
    </div>
  );
}
