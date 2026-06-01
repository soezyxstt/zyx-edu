import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { pageTitle } from "@/lib/site";
import { getCourseById, getMaterialsForCourse } from "@/lib/student-course-fixtures";
import { DocumentListClient } from "./document-list-client";
import { Reveal } from "@/components/ui/reveal";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const course = getCourseById(id);

  return {
    title: pageTitle(course ? `${course.title} - Materi` : "Materi"),
    description: "Materi belajar kelas.",
  };
}

export default async function CourseMaterialListPage({ params }: Props) {
  const { id } = await params;
  const course = getCourseById(id);
  if (!course) return null;

  return (
    <CoursePageShell
      eyebrow={
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-widest">
          <Link href="/courses" className="hover:text-primary transition-colors">Katalog</Link>
          <ChevronRight className="size-3" />
          <Link href={`/courses/${id}`} className="hover:text-primary transition-colors">{course.title}</Link>
        </div>
      }
      title="Materi Belajar"
      description="Modul, diktat, dan lembar soal untuk membantu pemahaman materi Anda."
      hideHeader
    >
      <Reveal>
        <DocumentListClient courseId={id} materials={getMaterialsForCourse(id)} />
      </Reveal>
    </CoursePageShell>
  );
}
