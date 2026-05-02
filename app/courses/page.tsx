import type { Metadata } from "next";
import Link from "next/link";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { courseCardClass } from "@/components/course/course-surfaces";
import { Button } from "@/components/ui/button";
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
          Pilah course yang <span className="font-bold italic text-primary">cocok</span> untuk ritmemu
        </>
      }
      description="Preview dengan data contoh. Setelah enrollment aktif, daftar akan disaring dari server sesuai paketmu."
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => (
          <article
            key={c.id}
            className={`${courseCardClass()} flex flex-col motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:-translate-y-0.5`}
          >
            <span className="inline-flex w-fit rounded-full bg-primary/10 px-3 py-0.5 text-body-sm font-medium text-primary">
              {c.category}
            </span>
            <h2 className="mt-3 font-heading text-h5 font-semibold text-foreground">{c.title}</h2>
            <p className="mt-2 line-clamp-3 flex-1 text-body-sm text-muted-foreground">{c.description}</p>
            <Button
              asChild
              className="interactive mt-5 w-full rounded-full motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98] sm:w-auto"
            >
              <Link href={`/courses/${c.id}`}>Buka course</Link>
            </Button>
          </article>
        ))}
      </div>
      <p className="mt-10 text-body-sm text-muted-foreground">
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
    </CoursePageShell>
  );
}
