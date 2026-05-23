import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { Reveal } from "@/components/ui/reveal";
import { pageTitle } from "@/lib/site";
import { listCourses } from "@/lib/student-course-fixtures";

export const metadata: Metadata = {
  title: pageTitle("Courses"),
  description: "Katalog course Zyx Edu — enrollment diaktifkan oleh admin sesuai paket.",
};

export default function CoursesPage() {
  const courses = listCourses();

  return (
    <CoursePageShell
      eyebrow="Katalog"
      headingTier="primary"
      title={
        <>
          Course yang <span className="font-bold italic text-primary">cocok</span> untuk ritmemu
        </>
      }
      description="Pilih kelas, buka dokumen gratis, lalu aktifkan token untuk fitur premium."
    >
      <Reveal>
        <div className="overflow-hidden rounded-lg border border-border/70 bg-card/70 backdrop-blur-sm">
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/courses/${c.id}`}
              className="group grid gap-3 border-b border-border/60 px-4 py-4 transition-colors last:border-0 hover:bg-muted/35 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-heading text-h6 font-semibold text-foreground group-hover:text-primary">
                    {c.title}
                  </h2>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {c.category}
                  </span>
                </div>
                <p className="mt-1 line-clamp-1 text-body-sm text-muted-foreground">{c.description}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-body-sm font-semibold text-brand-primary">
                Buka
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-5 text-body-sm text-muted-foreground">
          Perlu akses?{" "}
          <Link href="/plans" className="font-medium text-primary underline-offset-4 hover:underline">
            Lihat paket
          </Link>{" "}
          atau{" "}
          <Link href="/feedback" className="font-medium text-primary underline-offset-4 hover:underline">
            hubungi kami
          </Link>
          .
        </p>
      </Reveal>
    </CoursePageShell>
  );
}
