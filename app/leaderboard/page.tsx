import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Trophy, ChevronRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  studentQuizAttempts,
  quizTemplates,
  enrollments,
  courses,
  user,
} from "@/db/schema";
import { and, eq, sql, gt, inArray } from "drizzle-orm";
import { pageTitle } from "@/lib/site";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: pageTitle("Papan Peringkat"),
  description: "Peringkat kuis AI per kursus.",
};

function rankClass(rank: number) {
  if (rank === 1) return "bg-primary/[0.06] ring-1 ring-primary/15";
  if (rank === 2) return "bg-muted/30";
  if (rank === 3) return "bg-muted/20";
  return "";
}

export default async function LeaderboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");

  const now = new Date();

  // Get all courses the student is enrolled in
  const enrolled = await db
    .select({ courseId: enrollments.courseId })
    .from(enrollments)
    .where(and(eq(enrollments.userId, session.user.id), gt(enrollments.expiresAt, now)));

  const courseIds = enrolled.map((e) => e.courseId);

  // Get course titles
  const allCourses =
    courseIds.length > 0
      ? await db
          .select({ id: courses.id, title: courses.title })
          .from(courses)
          .where(inArray(courses.id, courseIds))
      : [];

  // Per-course leaderboard: top 10 per course
  const leaderboardByCourse: Record<
    string,
    { rank: number; name: string; avgScore: number; attempts: number }[]
  > = {};

  for (const course of allCourses) {
    const rows = await db
      .select({
        studentName: user.name,
        avgScore: sql<number>`round(avg(${studentQuizAttempts.score}), 1)`,
        attempts: sql<number>`count(*)`,
      })
      .from(studentQuizAttempts)
      .innerJoin(quizTemplates, eq(studentQuizAttempts.templateId, quizTemplates.id))
      .innerJoin(user, eq(studentQuizAttempts.studentId, user.id))
      .where(
        and(
          eq(quizTemplates.courseId, course.id),
          eq(studentQuizAttempts.status, "completed"),
        ),
      )
      .groupBy(user.name)
      .orderBy(sql`avg(${studentQuizAttempts.score}) DESC`)
      .limit(10);

    leaderboardByCourse[course.id] = rows.map((r, i) => ({
      rank: i + 1,
      name: r.studentName,
      avgScore: Number(r.avgScore),
      attempts: r.attempts,
    }));
  }

  return (
    <Reveal className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <Trophy className="size-7 text-brand-primary shrink-0" aria-hidden />
        <div>
          <h1 className="font-heading text-h4 font-semibold text-foreground">Papan Peringkat</h1>
          <p className="mt-1 text-body-sm text-muted-foreground">
            Peringkat kuis AI berdasarkan rata-rata skor tiap kursus.
          </p>
        </div>
      </div>

      {allCourses.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-body-sm text-muted-foreground">
            Kamu belum terdaftar di kursus manapun.{" "}
            <Link href="/courses" className="text-brand-primary hover:underline font-medium">
              Jelajahi kursus
            </Link>{" "}
            untuk memulai.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {allCourses.map((course) => {
            const rows = leaderboardByCourse[course.id] ?? [];
            return (
              <section key={course.id}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-heading text-h6 font-semibold text-foreground">
                    {course.title}
                  </h2>
                  <Link
                    href={`/courses/${course.id}/leaderboard`}
                    className="flex items-center gap-1 text-body-sm text-brand-primary hover:underline"
                  >
                    Lihat semua
                    <ChevronRight className="size-3.5" />
                  </Link>
                </div>

                {rows.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground py-4">
                    Belum ada kuis yang diselesaikan untuk kursus ini.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border bg-card/75">
                    <table className="w-full text-left text-body-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-14">
                            #
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Nama
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                            Rata-rata
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                            Kuis
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr
                            key={r.name}
                            className={cn(
                              "border-b border-border/60 last:border-0 transition-colors",
                              rankClass(r.rank),
                            )}
                          >
                            <td className="px-4 py-3 tabular-nums font-bold text-foreground">
                              {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank}
                            </td>
                            <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                            <td className="px-4 py-3 tabular-nums font-semibold text-primary text-right">
                              {r.avgScore}%
                            </td>
                            <td className="px-4 py-3 tabular-nums text-muted-foreground text-right">
                              {r.attempts}×
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </Reveal>
  );
}
