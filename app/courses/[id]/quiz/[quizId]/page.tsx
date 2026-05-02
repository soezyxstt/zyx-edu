import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { QuizPlayer } from "@/components/course/quiz-player";
import { pageTitle } from "@/lib/site";
import { getCourseById, getExamById } from "@/lib/student-course-fixtures";

type Props = { params: Promise<{ id: string; quizId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, quizId } = await params;
  const course = getCourseById(id);
  const exam = getExamById(id, quizId);
  return {
    title: pageTitle(course && exam ? `${course.title} — ${exam.title}` : "Kuis"),
    description: exam?.title ?? "Kuis course",
  };
}

export default async function CourseQuizTakePage({ params }: Props) {
  const { id, quizId } = await params;
  const course = getCourseById(id);
  const exam = getExamById(id, quizId);
  if (!course || !exam || exam.type !== "quiz") notFound();

  return (
    <CoursePageShell
      title={exam.title}
      description="Jawab dengan santai — progres tersimpan setelah integrasi submissions."
    >
      <QuizPlayer courseId={id} exam={exam} />
    </CoursePageShell>
  );
}
