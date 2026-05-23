import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";
import { checkEnrollment } from "@/app/dashboard/actions";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { courseListRowClass } from "@/components/course/course-surfaces";
import { EnrollmentForm } from "@/components/enrollment-form";
import { Reveal } from "@/components/ui/reveal";
import { pageTitle } from "@/lib/site";
import { cn } from "@/lib/utils";
import { getCourseById, getSubmissionsForCourse } from "@/lib/student-course-fixtures";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const course = getCourseById(id);
  return {
    title: pageTitle(course ? `${course.title} - Hasil saya` : "Hasil saya"),
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

  const isEnrolled = await checkEnrollment(id);

  if (!isEnrolled) {
    return (
      <CoursePageShell eyebrow="Riwayat" title="Hasil terkunci" description="Riwayat pengerjaan kuis dan tryout." hideHeader>
        <Reveal>
          <div className="rounded-lg border border-border/70 bg-card/75 p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border">
                <Lock className="size-5" />
              </div>
              <div>
                <h3 className="font-heading text-body-base font-bold text-foreground">Butuh token kelas</h3>
                <p className="mt-1 text-body-sm text-muted-foreground">
                  Aktifkan kelas untuk melihat skor dan pembahasan.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <EnrollmentForm />
            </div>
          </div>
        </Reveal>
      </CoursePageShell>
    );
  }

  const submissions = getSubmissionsForCourse(id);

  return (
    <CoursePageShell
      eyebrow="Riwayat"
      title="Hasil saya"
      description="Skor kuis, status tryout, dan review jawaban."
      hideHeader
    >
      <Reveal>
        <ul className="space-y-2">
          {submissions.map((submission) => (
            <li key={submission.id}>
              <Link href={`/courses/${id}/my-results/${submission.id}`} className={courseListRowClass("items-center")}>
                <div className="min-w-0 flex-1 text-left">
                  <h2 className="truncate font-heading text-body-base font-semibold text-foreground group-hover:text-primary">
                    {submission.examTitle}
                  </h2>
                  <p className="mt-1 text-body-sm text-muted-foreground">
                    {submission.examType === "quiz" ? "Kuis" : "Tryout"} ·{" "}
                    {new Date(submission.submittedAt).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <span
                    className={cn(
                      "mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-border/60",
                      submission.status === "pending_review"
                        ? "bg-status-warning/12 text-status-warning"
                        : "bg-muted/80 text-muted-foreground",
                    )}
                  >
                    {statusBadge(submission.status)}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-heading text-h6 font-bold tabular-nums text-foreground">
                    {submission.score != null ? `${submission.score}%` : "Pending"}
                  </p>
                  <p className="text-body-sm text-muted-foreground">Review</p>
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
      </Reveal>
    </CoursePageShell>
  );
}
