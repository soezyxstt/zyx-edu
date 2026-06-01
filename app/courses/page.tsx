import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardList } from "lucide-react";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { Reveal } from "@/components/ui/reveal";
import { pageTitle } from "@/lib/site";
import {
  listCourses,
  getMaterialsForCourse,
  getExamsForCourse,
} from "@/lib/student-course-fixtures";

export const metadata: Metadata = {
  title: pageTitle("Courses"),
  description: "Katalog course Zyx Academy - enrollment diaktifkan oleh admin sesuai paket.",
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => {
            const materials = getMaterialsForCourse(c.id);
            const quizzes = getExamsForCourse(c.id, "quiz");
            const tryouts = getExamsForCourse(c.id, "tryout");

            return (
              <div
                key={c.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/60 bg-card/65 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-brand-primary/45 hover:bg-card hover:shadow-md hover:shadow-brand-primary/5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex rounded-md bg-brand-primary/10 px-2.5 py-0.5 text-xs font-semibold text-brand-primary ring-1 ring-brand-primary/20">
                      {c.category}
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      ITB TPB
                    </span>
                  </div>

                  <h2 className="mt-4 font-heading text-h5 font-bold tracking-tight text-foreground transition-colors group-hover:text-brand-primary">
                    {c.title}
                  </h2>

                  <p className="mt-2.5 text-body-sm leading-relaxed text-muted-foreground line-clamp-3">
                    {c.description}
                  </p>

                  <div className="mt-5 space-y-2 border-t border-border/50 pt-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <BookOpen className="size-3.5 text-brand-primary" />
                      <span>{materials.length} Bahan belajar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ClipboardList className="size-3.5 text-tertiary-1" />
                      <span>{quizzes.length} Kuis &middot; {tryouts.length} Tryout</span>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/courses/${c.id}`}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-muted/60 py-3 text-body-sm font-semibold text-foreground transition-all duration-200 hover:bg-brand-primary hover:text-white"
                >
                  Buka Kelas
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-body-sm text-muted-foreground">
          Perlu akses?{" "}
          <Link href="/plans" className="font-semibold text-primary underline-offset-4 hover:underline">
            Lihat paket
          </Link>{" "}
          atau{" "}
          <Link href="/feedback" className="font-semibold text-primary underline-offset-4 hover:underline">
            hubungi kami
          </Link>
          .
        </p>
      </Reveal>
    </CoursePageShell>
  );
}
