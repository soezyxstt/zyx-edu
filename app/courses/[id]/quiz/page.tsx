import type { Metadata } from "next";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { pageTitle } from "@/lib/site";
import { getCourseById, getExamsForCourse } from "@/lib/student-course-fixtures";
import { checkEnrollment } from "@/app/dashboard/actions";
import { QuizListClient } from "./quiz-list-client";
import { Reveal } from "@/components/ui/reveal";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const course = getCourseById(id);
  return {
    title: pageTitle(course ? `${course.title} — Kuis` : "Kuis"),
    description: "Daftar kuis course",
  };
}

export default async function CourseQuizListPage({ params }: Props) {
  const { id } = await params;
  const course = getCourseById(id);
  if (!course) return null;

  const isEnrolled = await checkEnrollment(id);
  const quizzes = getExamsForCourse(id, "quiz");

  return (
    <CoursePageShell
      eyebrow="Latihan cepat"
      title="Kuis"
      description={!isEnrolled ? "Kuis gratis bisa dicoba; premium dibuka dengan token." : undefined}
      hideHeader
    >
      <Reveal>
        <QuizListClient courseId={id} isEnrolled={isEnrolled} quizzes={quizzes} />
      </Reveal>
    </CoursePageShell>
  );
}
