import type { Metadata } from "next";
import { ShellPage } from "@/components/shell-page";
import { pageTitle } from "@/lib/site";
import {
  getCourseById,
  getLeaderboard,
  LEADERBOARD_SCORE_HINT,
} from "@/lib/student-course-fixtures";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const course = getCourseById(id);
  return {
    title: pageTitle(course ? `${course.title} — Papan peringkat` : "Papan peringkat"),
    description: "Peringkat course berdasarkan kuis dan tryout",
  };
}

export default async function CourseLeaderboardPage({ params }: Props) {
  const { id } = await params;
  const course = getCourseById(id);
  if (!course) return null;

  const rows = getLeaderboard(id);

  return (
    <ShellPage
      title="Papan peringkat"
      description={LEADERBOARD_SCORE_HINT}
    >
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[32rem] text-left text-body-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                Peringkat
              </th>
              <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                Nama
              </th>
              <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                Skor gabungan
              </th>
              <th scope="col" className="px-4 py-3 font-semibold text-muted-foreground">
                Rata kuis %
              </th>
              <th scope="col" className="px-4 py-3 font-semibold text-muted-foreground">
                Rata tryout %
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">{r.rank}</td>
                <td className="px-4 py-3 text-foreground">{r.displayName}</td>
                <td className="px-4 py-3 font-semibold text-brand-primary">{r.score}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.quizAvgPercent}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.tryoutAvgPercent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? (
        <p className="mt-6 text-body-md text-muted-foreground">
          Belum ada data peringkat untuk course ini.
        </p>
      ) : null}
    </ShellPage>
  );
}
