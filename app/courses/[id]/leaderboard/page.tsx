import type { Metadata } from "next";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { pageTitle } from "@/lib/site";
import { cn } from "@/lib/utils";
import { getCourseById, getLeaderboard, LEADERBOARD_SCORE_HINT } from "@/lib/student-course-fixtures";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const course = getCourseById(id);
  return {
    title: pageTitle(course ? `${course.title} — Papan peringkat` : "Papan peringkat"),
    description: "Peringkat course berdasarkan kuis dan tryout",
  };
}

function rankRowClass(rank: number) {
  if (rank === 1) return "bg-primary/[0.06] ring-1 ring-primary/15 hover:bg-primary/[0.09]";
  if (rank === 2) return "bg-muted/30 hover:bg-muted/45";
  if (rank === 3) return "bg-muted/20 hover:bg-muted/35";
  return "hover:bg-muted/25";
}

export default async function CourseLeaderboardPage({ params }: Props) {
  const { id } = await params;
  const course = getCourseById(id);
  if (!course) return null;

  const rows = getLeaderboard(id);

  return (
    <CoursePageShell eyebrow="Komunitas" title="Papan peringkat" description={LEADERBOARD_SCORE_HINT}>
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/85 shadow-sm backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-lg text-left text-body-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th scope="col" className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Peringkat
                </th>
                <th scope="col" className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Nama
                </th>
                <th scope="col" className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Skor gabungan
                </th>
                <th scope="col" className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Rata kuis %
                </th>
                <th scope="col" className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Rata tryout %
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className={cn("border-b border-border/70 last:border-0", rankRowClass(r.rank))}>
                  <td className="px-5 py-4 tabular-nums font-semibold text-foreground">{r.rank}</td>
                  <td className="px-5 py-4 font-medium text-foreground">{r.displayName}</td>
                  <td className="px-5 py-4 tabular-nums font-semibold text-primary">{r.score}</td>
                  <td className="px-5 py-4 tabular-nums text-muted-foreground">{r.quizAvgPercent}</td>
                  <td className="px-5 py-4 tabular-nums text-muted-foreground">{r.tryoutAvgPercent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="mt-6 text-body-md text-muted-foreground">Belum ada data peringkat untuk course ini.</p>
      ) : null}
    </CoursePageShell>
  );
}
