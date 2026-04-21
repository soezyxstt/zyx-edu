import type { Metadata } from "next";
import Link from "next/link";
import { ShellPage } from "@/components/shell-page";
import { pageTitle } from "@/lib/site";
import { cn } from "@/lib/utils";
import { getCourseById, getSubmissionsForCourse } from "@/lib/student-course-fixtures";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const course = getCourseById(id);
  return {
    title: pageTitle(course ? `${course.title} — Hasil saya` : "Hasil saya"),
    description: "Riwayat kuis dan tryout",
  };
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    completed: "Selesai",
    pending_review: "Menunggu dinilai",
    graded: "Sudah dinilai",
    late: "Terlambat",
  };
  return map[status] ?? status;
}

export default async function CourseMyResultsPage({ params }: Props) {
  const { id } = await params;
  const course = getCourseById(id);
  if (!course) return null;

  const submissions = getSubmissionsForCourse(id);

  return (
    <ShellPage
      title="Hasil saya"
      description="Skor otomatis untuk kuis; esai tryout menampilkan Pending sampai pengajar memberi nilai."
    >
      <ul className="space-y-3">
        {submissions.map((s) => (
          <li key={s.id}>
            <Link
              href={`/courses/${id}/my-results/${s.id}`}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h2 className="font-heading text-h6 font-semibold text-foreground">{s.examTitle}</h2>
                <p className="mt-1 text-body-sm text-muted-foreground">
                  {s.examType === "quiz" ? "Kuis" : "Tryout"} ·{" "}
                  {new Date(s.submittedAt).toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                <p className="mt-2 text-body-sm">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-medium",
                      s.status === "pending_review"
                        ? "bg-status-warning/15 text-status-warning"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {statusBadge(s.status)}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="font-heading text-h5 font-bold text-foreground">
                  {s.score != null ? `${s.score}%` : "Pending"}
                </p>
                <p className="text-body-sm text-muted-foreground">Tinjau jawaban</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {submissions.length === 0 ? (
        <p className="text-body-md text-muted-foreground">Belum ada pengumpulan untuk course ini.</p>
      ) : null}
    </ShellPage>
  );
}
