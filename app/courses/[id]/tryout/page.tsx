import type { Metadata } from "next";
import Link from "next/link";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { courseListRowClass } from "@/components/course/course-surfaces";
import { Button } from "@/components/ui/button";
import { pageTitle } from "@/lib/site";
import { getCourseById, getExamsForCourse } from "@/lib/student-course-fixtures";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const course = getCourseById(id);
  return {
    title: pageTitle(course ? `${course.title} — Tryout` : "Tryout"),
    description: "Daftar tryout course",
  };
}

const statusLabel: Record<string, string> = {
  draft: "Draf",
  published: "Berlangsung",
  ended: "Selesai",
};

export default async function CourseTryoutListPage({ params }: Props) {
  const { id } = await params;
  const course = getCourseById(id);
  if (!course) return null;

  const tryouts = getExamsForCourse(id, "tryout");

  return (
    <CoursePageShell
      eyebrow="Simulasi"
      title="Tryout"
      description="Tryout lebih formal — tata letak rapi seperti formulir, mendukung esai dan unggah berkas."
    >
      <ul className="space-y-3">
        {tryouts.map((t) => (
          <li key={t.id}>
            <div className={courseListRowClass("flex-col gap-4 sm:flex-row sm:items-center sm:justify-between")}>
              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-h6 font-semibold text-foreground">{t.title}</h2>
                <p className="mt-2 text-body-sm text-muted-foreground">
                  {statusLabel[t.status] ?? t.status}
                  {t.settings?.timeLimitMinutes != null ? ` · ${t.settings.timeLimitMinutes} menit` : ""}
                  {t.settings?.maxAttempts != null ? ` · maks ${t.settings.maxAttempts} pengumpulan` : ""}
                </p>
                <p className="mt-1 text-body-sm text-muted-foreground">{t.questions.length} pertanyaan</p>
              </div>
              <div className="flex shrink-0 items-center self-stretch sm:self-center">
                {t.status === "published" ? (
                  <Button
                    asChild
                    className="interactive w-full rounded-full sm:w-auto motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]"
                  >
                    <Link href={`/courses/${id}/tryout/${t.id}`}>Buka tryout</Link>
                  </Button>
                ) : (
                  <Button type="button" className="w-full rounded-full sm:w-auto" disabled>
                    Tidak tersedia
                  </Button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {tryouts.length === 0 ? (
        <p className="text-body-md text-muted-foreground">Belum ada tryout.</p>
      ) : null}
    </CoursePageShell>
  );
}
