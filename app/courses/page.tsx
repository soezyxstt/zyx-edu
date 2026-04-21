import type { Metadata } from "next";
import Link from "next/link";
import { ShellPage } from "@/components/shell-page";
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
    <ShellPage
      title="Courses"
      description="Preview katalog dengan data contoh. Setelah enrollment aktif, course yang kamu miliki akan disaring dari server."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {courses.map((c) => (
          <div
            key={c.id}
            className="rounded-2xl border border-border bg-card p-6 text-left shadow-sm"
          >
            <p className="text-body-sm font-medium text-muted-foreground">{c.category}</p>
            <h2 className="mt-1 font-heading text-h5 font-semibold text-foreground">{c.title}</h2>
            <p className="mt-2 line-clamp-3 text-body-sm text-muted-foreground">{c.description}</p>
            <Button asChild variant="outline" className="mt-4 rounded-full">
              <Link href={`/courses/${c.id}`}>Buka course</Link>
            </Button>
          </div>
        ))}
      </div>
      <p className="mt-8 text-body-sm text-muted-foreground">
        Need access?{" "}
        <Link href="/plans" className="font-medium text-brand-primary underline-offset-4 hover:underline">
          View plans
        </Link>{" "}
        or{" "}
        <Link href="/feedback" className="font-medium text-brand-primary underline-offset-4 hover:underline">
          contact us
        </Link>
        .
      </p>
    </ShellPage>
  );
}
