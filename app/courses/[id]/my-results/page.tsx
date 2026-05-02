import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { courseListRowClass } from "@/components/course/course-surfaces";
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
    <CoursePageShell
      eyebrow="Riwayat"
      title="Hasil saya"
      description="Skor otomatis untuk kuis; esai tryout menampilkan Pending sampai pengajar memberi nilai."
    >
      <ul className="space-y-3">
        {submissions.map((s) => (
          <li key={s.id}>
            <Link href={`/courses/${id}/my-results/${s.id}`} className={courseListRowClass("items-center")}>
              <div className="min-w-0 flex-1 text-left">
                <h2 className="font-heading text-h6 font-semibold text-foreground group-hover:text-primary">
                  {s.examTitle}
                </h2>
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
                      "rounded-full px-2.5 py-0.5 text-body-sm font-medium ring-1 ring-border/60",
                      s.status === "pending_review"
                        ? "bg-status-warning/12 text-status-warning"
                        : "bg-muted/80 text-muted-foreground",
                    )}
                  >
                    {statusBadge(s.status)}
                  </span>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-heading text-h5 font-bold tabular-nums text-foreground">
                  {s.score != null ? `${s.score}%` : "Pending"}
                </p>
                <p className="text-body-sm text-muted-foreground">Tinjau jawaban</p>
              </div>
              <ChevronRight
                className="size-5 shrink-0 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
      {submissions.length === 0 ? (
        <p className="text-body-md text-muted-foreground">Belum ada pengumpulan untuk course ini.</p>
      ) : null}
    </CoursePageShell>
  );
}
