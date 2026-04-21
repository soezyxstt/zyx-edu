import type { Metadata } from "next";
import Link from "next/link";
import { ShellPage } from "@/components/shell-page";
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
    <ShellPage
      title="Tryout"
      description="Tryout lebih formal — tata letak rapi seperti formulir, mendukung esai dan unggah berkas."
    >
      <ul className="space-y-4">
        {tryouts.map((t) => (
          <li
            key={t.id}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-heading text-h6 font-semibold text-foreground">{t.title}</h2>
                <p className="mt-2 text-body-sm text-muted-foreground">
                  {statusLabel[t.status] ?? t.status}
                  {t.settings?.timeLimitMinutes != null
                    ? ` · ${t.settings.timeLimitMinutes} menit`
                    : ""}
                  {t.settings?.maxAttempts != null
                    ? ` · maks ${t.settings.maxAttempts} pengumpulan`
                    : ""}
                </p>
                <p className="mt-1 text-body-sm text-muted-foreground">
                  {t.questions.length} pertanyaan
                </p>
              </div>
              {t.status === "published" ? (
                <Button asChild className="rounded-full md:shrink-0">
                  <Link href={`/courses/${id}/tryout/${t.id}`}>Buka tryout</Link>
                </Button>
              ) : (
                <Button type="button" className="rounded-full md:shrink-0" disabled>
                  Tidak tersedia
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {tryouts.length === 0 ? (
        <p className="text-body-md text-muted-foreground">Belum ada tryout.</p>
      ) : null}
    </ShellPage>
  );
}
