import type { Metadata } from "next";
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
    <CoursePageShell title="Materi" hideHeader>
      <Reveal>
        <DocumentListClient courseId={id} materials={getMaterialsForCourse(id)} />
      </Reveal>
    </CoursePageShell>
  );
}
