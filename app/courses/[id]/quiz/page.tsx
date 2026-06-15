import type { Metadata } from "next";

import { CoursePageShell } from "@/components/course/course-page-shell";
import { pageTitle } from "@/lib/site";
import { checkEnrollment } from "@/app/dashboard/actions";
import { QuizListClient } from "./quiz-list-client";
import { Reveal } from "@/components/ui/reveal";
import { db } from "@/db";
import { courses, quizTemplates, studentQuizAttempts } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [course] = await db
    .select({ title: courses.title })
    .from(courses)
    .where(eq(courses.id, id))
    .limit(1);

  return {
    title: pageTitle(course ? `${course.title} - Kuis` : "Kuis"),
    description: "Daftar kuis course",
  };
}

export default async function CourseQuizListPage({ params }: Props) {
  const { id } = await params;
  
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, id))
    .limit(1);

  if (!course) notFound();

  const isEnrolled = await checkEnrollment(id);

  // Retrieve templates
  const templates = await db
    .select()
    .from(quizTemplates)
    .where(eq(quizTemplates.courseId, id))
    .orderBy(desc(quizTemplates.createdAt));

  // Retrieve previous attempts
  const session = await auth.api.getSession({ headers: await headers() });
  const studentId = session?.user?.id;
  const attempts = studentId
    ? await db
        .select()
        .from(studentQuizAttempts)
        .where(eq(studentQuizAttempts.studentId, studentId))
    : [];

  return (
    <CoursePageShell>
      <Reveal>
        <QuizListClient
          courseId={id}
          isEnrolled={isEnrolled}
          templates={templates}
          attempts={attempts}
        />
      </Reveal>
    </CoursePageShell>
  );
}
