import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { courseListRowClass } from "@/components/course/course-surfaces";
import { pageTitle } from "@/lib/site";
import { cn } from "@/lib/utils";
import { getCourseById, getSubmissionsForCourse } from "@/lib/student-course-fixtures";
import { checkEnrollment } from "@/app/dashboard/actions";
import { EnrollmentForm } from "@/components/enrollment-form";
import { Reveal } from "@/components/ui/reveal";

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

  const isEnrolled = await checkEnrollment(id);

  if (!isEnrolled) {
    return (
      <CoursePageShell eyebrow="Riwayat" title="Hasil Saya Terkunci" description="Riwayat pengerjaan kuis dan tryout.">
        <Reveal>
          <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-md">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4 ring-1 ring-border">
              <Lock className="size-6" />
            </div>
            <h3 className="font-heading text-body-lg font-bold text-foreground">Konten Premium</h3>
            <p className="mt-2 text-body-sm text-muted-foreground leading-relaxed">
              Riwayat nilai dan pembahasan jawaban adalah fitur eksklusif siswa terdaftar. Masukkan token pendaftaran Anda di bawah ini untuk melihat hasil belajar Anda.
            </p>
            <div className="mt-6 rounded-xl border border-border/85 bg-muted/40 p-5 text-left">
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
      description="Skor otomatis untuk kuis; esai tryout menampilkan Pending sampai pengajar memberi nilai."
    >
      <Reveal>
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
      </Reveal>
    </CoursePageShell>
  );
}
