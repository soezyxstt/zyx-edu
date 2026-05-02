import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { TryoutForm } from "@/components/course/tryout-form";
import { pageTitle } from "@/lib/site";
import { getCourseById, getExamById } from "@/lib/student-course-fixtures";

type Props = { params: Promise<{ id: string; tryoutId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, tryoutId } = await params;
  const course = getCourseById(id);
  const exam = getExamById(id, tryoutId);
  return {
    title: pageTitle(course && exam ? `${course.title} — ${exam.title}` : "Tryout"),
    description: exam?.title ?? "Tryout course",
  };
}

export default async function CourseTryoutTakePage({ params }: Props) {
  const { id, tryoutId } = await params;
  const course = getCourseById(id);
  const exam = getExamById(id, tryoutId);
  if (!course || !exam || exam.type !== "tryout") notFound();

  return (
    <CoursePageShell
      title={exam.title}
      description="Isi semua bagian dengan teliti. Esai akan dinilai oleh pengajar."
    >
      <TryoutForm courseId={id} exam={exam} />
    </CoursePageShell>
  );
}
