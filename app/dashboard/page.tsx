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
  Flame,
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
import { getCourseMaterials, getCourseQuizzes, getCourseTryouts } from "@/lib/course-utils";
import { DashboardWeakConcepts } from "@/components/course/dashboard-weak-concepts";
import { TodayPlan } from "@/components/dashboard/today-plan";
import { env } from "@/lib/env";
import { getMastery } from "@/lib/mastery-store";
import { InterventionBanner } from "@/components/dashboard/intervention-banner";
import { db } from "@/db";
import { weeklyReflections } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { WeeklyReflection } from "@/components/dashboard/weekly-reflection";
import { getOrUpdateStreak } from "@/lib/streak-service";
import { ActivateClassModal } from "@/components/dashboard/activate-class-modal";
import { PageHeader } from "@/components/page-header";
import { studentCardClass } from "@/components/course/course-surfaces";
import { cn } from "@/lib/utils";


export const metadata: Metadata = {
  title: pageTitle("Dashboard Siswa"),
  description:
    "Pantau progres belajar, materi, kuis, tryout ITB TPB — semua dalam satu ruang belajar personal.",
};

export default async function DashboardPage() {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  const user = session?.user;
  const userName = user?.name || "Siswa";

  const featureToday = env.FEATURE_TODAY === "1";
  const firstName = userName.split(" ")[0];

  const [enrollments, progressList, submissionsList] = await Promise.all([
    getStudentEnrollments(),
    getMaterialsProgress(),
    getStudentSubmissions(),
  ]);

  let streakInfo = null;
  if (user?.id) {
    try {
      streakInfo = await getOrUpdateStreak(user.id);
    } catch (e) {
      console.error("Error loading streak:", e);
    }
  }

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

  // Resolve all materials, quizzes, and tryouts for enrolled courses
  const courseDataList = await Promise.all(
    enrolledCourseIds.map(async (courseId) => {
      const [materials, quizzes, tryouts] = await Promise.all([
        getCourseMaterials(courseId),
        getCourseQuizzes(courseId),
        getCourseTryouts(courseId),
      ]);
      return {
        courseId,
        materials,
        exams: [...quizzes, ...tryouts],
      };
    })
  );

  const courseDataMap = new Map(courseDataList.map((d) => [d.courseId, d]));

  // 1. In-progress documents (materials)
  const inProgressRecords = progressList.filter((p) => p.status === "in_progress");
  const inProgressDocuments = inProgressRecords
    .map((record) => {
      for (const courseData of courseDataList) {
        const mat = courseData.materials.find((m) => m.id === record.materialId);
        if (mat) {
          const course = enrollments.find((e) => e.id === courseData.courseId);
          return {
            ...mat,
            courseTitle: course?.title || "Course",
            courseId: courseData.courseId,
          };
        }
      }
      return null;
    })
    .filter((document) => document !== null);

  // 2. Available exams
  const availableExams = courseDataList.flatMap((courseData) => {
    const course = enrollments.find((e) => e.id === courseData.courseId);
    return courseData.exams
      .filter((exam) => {
        const alreadySubmitted = submissionsList.some(
          (sub) => sub.examId === exam.id && sub.status !== "pending_review"
        );
        return !alreadySubmitted;
      })
      .map((exam) => ({
        ...exam,
        courseTitle: course?.title || "Course",
        courseId: courseData.courseId,
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
            <PageHeader
              title={
                <>
                  Halo, <span className="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">{userName}</span>!
                </>
              }
              description="Mari lanjutkan aktivitas belajarmu hari ini."
              actions={
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-1.5 shadow-xs">
                    <GraduationCap className="size-4 text-brand-primary" />
                    <div className="text-left">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none">Kelas</p>
                      <p className="text-body-xs font-semibold text-foreground mt-0.5 leading-none">{enrollments.length} Aktif</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-1.5 shadow-xs">
                    <Bookmark className="size-4 text-brand-primary" />
                    <div className="text-left">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none">Materi</p>
                      <p className="text-body-xs font-semibold text-foreground mt-0.5 leading-none">{inProgressDocuments.length} Dibaca</p>
                    </div>
                  </div>

                  {streakInfo && (
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-1.5 shadow-xs">
                      <Flame className={cn("size-4", streakInfo.current > 0 ? "text-brand-secondary fill-brand-secondary/10" : "text-muted-foreground")} />
                      <div className="text-left">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none">Streak</p>
                        <p className="text-body-xs font-semibold text-foreground mt-0.5 leading-none">
                          {streakInfo.current > 0 ? `${streakInfo.current} Hari` : "Mulai Hari Ini"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              }
            />
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

            <div className={studentCardClass("mt-8 bg-gradient-to-br from-brand-primary/5 via-transparent to-tertiary-3/5 text-left shadow-xs")}>
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
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Column (Main study track) - 7 cols */}
            <div className="space-y-6 lg:col-span-7">
              {/* Classes list Section */}
              <div className={studentCardClass()}>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-y-2">
                  <h2 className="font-heading text-body-base font-bold text-foreground flex items-center gap-2">
                    <GraduationCap className="size-5 text-brand-primary" />
                    Kelas Aktif
                  </h2>
                  <div className="flex items-center gap-3">
                    <ActivateClassModal />
                    <Link href="/courses" className="text-body-xs font-bold text-brand-primary hover:underline flex items-center gap-0.5">
                      Lihat Semua
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="divide-y divide-border/50">
                  {enrollments.map((course) => {
                    const materials = courseDataMap.get(course.id)?.materials || [];
                    const courseCompletedIds = progressList
                      .filter((p) => p.status === "completed")
                      .map((p) => p.materialId);
                    const doneCount = materials.filter((m) => courseCompletedIds.includes(m.id)).length;
                    const progressPct = materials.length > 0 ? Math.round((doneCount / materials.length) * 100) : 0;

                    return (
                      <Link
                        key={course.id}
                        href={`/courses/${course.id}`}
                        className="group block py-4 hover:bg-muted/30 px-4 -mx-4 rounded-xl transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            {/* Category Badge + Title on one line */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex rounded-md bg-brand-primary/10 px-2 py-0.5 text-[10px] font-bold text-brand-primary uppercase tracking-wider ring-1 ring-brand-primary/20 shrink-0">
                                {course.category}
                              </span>
                              <h3 className="font-heading text-body-sm font-bold text-foreground group-hover:text-brand-primary transition-colors truncate min-w-0">
                                {course.title}
                              </h3>
                            </div>
                            
                            {/* Sleek inline progress */}
                            <div className="mt-3 flex items-center gap-3 max-w-md">
                              <div className="h-1.5 w-24 overflow-hidden rounded bg-muted/70">
                                <div
                                  className="h-full bg-brand-primary transition-all duration-300 rounded"
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                              <span className="text-body-xs font-semibold text-foreground">{progressPct}%</span>
                              <span className="text-body-xs text-muted-foreground">({doneCount} dari {materials.length} materi)</span>
                            </div>

                            {env.FEATURE_STUDY_PATH === "1" && nextConcepts[course.id] && (
                              <div className="mt-2.5 text-body-xs font-medium text-muted-foreground">
                                Langkah selanjutnya:{" "}
                                <span className="text-brand-primary font-semibold group-hover:underline">
                                  {nextConcepts[course.id]}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Interactive arrow indicator */}
                          <div className="flex size-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground group-hover:text-brand-primary group-hover:border-brand-primary/30 transition-all shrink-0">
                            <ArrowUpRight className="size-4" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Documents In Progress ("sedang dibaca tetapi belum selesai") */}
              <div className={studentCardClass()}>
                <h2 className="font-heading text-body-base font-bold text-foreground flex items-center gap-2 mb-5">
                  <Bookmark className="size-5 text-brand-primary" />
                  Materi Terbuka (Belum Selesai)
                </h2>
                {inProgressDocuments.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {inProgressDocuments.map((doc) => {
                      if (!doc) return null;
                      return (
                        <div key={doc.id} className="group py-4.5 first:pt-0 last:pb-0">
                          <Link
                            href={`/courses/${doc.courseId}/material/${doc.id}`}
                            className="flex items-center justify-between gap-4"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex rounded-md border border-border/50 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                  {doc.courseTitle}
                                </span>
                                <span className="text-body-xs text-muted-foreground capitalize">
                                  ({doc.kind})
                                </span>
                              </div>
                              <h4 className="font-heading text-body-sm font-bold text-foreground group-hover:text-brand-primary transition-colors mt-2 truncate">
                                {doc.title}
                              </h4>
                            </div>
                            <Button size="sm" variant="outline" className="rounded-md gap-1.5 shrink-0 pointer-events-none group-hover:bg-muted transition-colors">
                              <Play className="size-3 fill-current" />
                              Lanjutkan
                            </Button>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-border/60">
                    <CheckCircle2 className="size-8 text-muted-foreground/30 mb-2" />
                    <p className="text-body-sm text-muted-foreground">Semua dokumen telah selesai dibaca!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (Activities & Task list) - 5 cols */}
            <div className="space-y-6 lg:col-span-5">
              <DashboardWeakConcepts concepts={masteryConcepts} />
              
              {/* Quizzes and Tryouts */}
              <div className={studentCardClass()}>
                <h2 className="font-heading text-body-base font-bold text-foreground flex items-center gap-2 mb-5">
                  <ClipboardList className="size-5 text-brand-primary" />
                  Kuis & Tryout Tersedia
                </h2>
                {availableExams.length > 0 ? (
                  <ul className="divide-y divide-border/50">
                    {availableExams.map((exam) => (
                      <li key={exam.id} className="group py-4.5 first:pt-0 last:pb-0">
                        <Link
                          href={`/courses/${exam.courseId}/${exam.type}/${exam.id}`}
                          className="flex items-center justify-between gap-4"
                        >
                          <div className="min-w-0 flex-1">
                            <h4 className="font-heading text-body-sm font-bold text-foreground group-hover:text-brand-primary transition-colors truncate">
                              {exam.title}
                            </h4>
                            <p className="text-body-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                              <span className="font-semibold text-brand-primary">{exam.courseTitle}</span>
                              <span className="text-border-strong">·</span>
                              <span className="capitalize">{exam.type}</span>
                            </p>
                          </div>
                          <Button size="sm" className="rounded-md shrink-0 pointer-events-none group-hover:bg-brand-primary/95 transition-all">
                            Kerjakan
                          </Button>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-border/60">
                    <Trophy className="size-8 text-brand-secondary/60 mb-2" />
                    <p className="text-body-sm text-muted-foreground">Semua ujian telah selesai.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </Reveal>
      </div>
    </div>
  );
}
