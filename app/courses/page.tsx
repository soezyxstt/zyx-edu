import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardList } from "lucide-react";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { Reveal } from "@/components/ui/reveal";
import { pageTitle } from "@/lib/site";
import { studentInteractiveCardClass } from "@/components/course/course-surfaces";
import {
  listCourses,
  getMaterialsForCourse,
  getExamsForCourse,
} from "@/lib/student-course-fixtures";
import { db } from "@/db";
import { courses as coursesTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: pageTitle("Courses"),
  description: "Katalog course Zyx Academy - enrollment diaktifkan oleh admin sesuai paket.",
};

export default async function CoursesPage() {
  // Fetch courses from DB (authoritative) and fall back to fixtures for missing entries
  const dbCourses = await db.select().from(coursesTable);
  const TEST_COURSE_IDS = new Set([
    "embed-test-course",
    "miscon-test-course",
    "remed-test-course",
    "term-test-course",
    "graph-test-course",
  ]);
  const fixtureCourses = listCourses().filter((c) => !TEST_COURSE_IDS.has(c.id));
  const courseMap = new Map(dbCourses.map((c) => [c.id, c] as [string, any]));
  const merged: typeof dbCourses = [];
  // Add DB courses first
  for (const c of dbCourses) {
    if (!TEST_COURSE_IDS.has(c.id)) merged.push(c);
  }
  // Add any fixture courses not present in DB
  for (const fc of fixtureCourses) {
    if (!courseMap.has(fc.id)) merged.push(fc as any);
  }
  const courses = merged;

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
                className={studentInteractiveCardClass("justify-between")}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex rounded-md bg-brand-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-brand-primary uppercase tracking-wider ring-1 ring-brand-primary/20">
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
