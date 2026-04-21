import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { ShellPage } from "@/components/shell-page";
import { pageTitle } from "@/lib/site";
import { cn } from "@/lib/utils";
import { getCourseById, getMaterialsForCourse } from "@/lib/student-course-fixtures";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const course = getCourseById(id);
  return {
    title: pageTitle(course ? `${course.title} — Materi` : "Materi"),
    description: "Daftar materi course",
  };
}

const kindLabel: Record<string, string> = {
  article: "Artikel",
  pdf: "PDF",
  image: "Gambar",
  video: "Video",
  link: "Tautan",
};

export default async function CourseMaterialListPage({ params }: Props) {
  const { id } = await params;
  const course = getCourseById(id);
  if (!course) return null;

  const materials = getMaterialsForCourse(id);

  return (
    <ShellPage
      title="Materi"
      description="Baca, tonton, atau unduh materi. Tandai selesai untuk melacak progres (preview lokal)."
    >
      <ul className="space-y-3">
        {materials.map((m) => (
          <li key={m.id}>
            <Link
              href={`/courses/${id}/material/${m.id}`}
              className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/20"
            >
              <span className="mt-0.5 text-primary" aria-hidden>
                {m.completed ? (
                  <CheckCircle2 className="size-6" />
                ) : (
                  <Circle className="size-6 text-muted-foreground" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-h6 font-semibold text-foreground">{m.title}</h2>
                <p className="mt-1 text-body-sm text-muted-foreground">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-body-sm font-medium",
                      "bg-muted text-muted-foreground",
                    )}
                  >
                    {kindLabel[m.kind] ?? m.kind}
                  </span>
                  {m.completed ? (
                    <span className="ml-2 text-status-success">Selesai</span>
                  ) : (
                    <span className="ml-2">Belum selesai</span>
                  )}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {materials.length === 0 ? (
        <p className="text-body-md text-muted-foreground">Belum ada materi untuk course ini.</p>
      ) : null}
    </ShellPage>
  );
}
