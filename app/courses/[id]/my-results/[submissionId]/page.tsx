import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { pageTitle } from "@/lib/site";
import { db } from "@/db";
import { studentQuizAttempts, courses } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { AttemptReview } from "@/components/course/attempt-review";
import { ReviewClient } from "./review-client";
import {
  getSubmissionListItem,
  getSubmissionReview,
} from "@/lib/student-course-fixtures";

type Props = { params: Promise<{ id: string; submissionId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, id))
    .limit(1);

  return {
    title: pageTitle(course ? `${course.title} - Tinjau Jawaban` : "Tinjau Jawaban"),
    description: "Tinjau jawaban kuis atau tryout Anda",
  };
}

export default async function SubmissionReviewPage({ params }: Props) {
  const { id, submissionId } = await params;
  
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, id))
    .limit(1);

  if (!course) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) notFound();

  // 1. Check if it's a quiz attempt
  const [attempt] = await db
    .select()
    .from(studentQuizAttempts)
    .where(
      and(
        eq(studentQuizAttempts.id, submissionId),
        eq(studentQuizAttempts.studentId, session.user.id)
      )
    )
    .limit(1);

  if (attempt) {
    return (
      <CoursePageShell eyebrow="Review" title="Review kuis" description="Pembahasan kuis Anda" hideHeader>
        <Reveal>
          <div className="mb-6">
            <Button
              asChild
              variant="outline"
              className="interactive rounded-md border-border/80 text-muted-foreground hover:text-foreground"
            >
              <Link href={`/courses/${id}/my-results`}>Kembali ke hasil</Link>
            </Button>
          </div>

          <AttemptReview attemptId={submissionId} />
        </Reveal>
      </CoursePageShell>
    );
  }

  // 2. Otherwise fallback to tryouts (from fixtures or DB)
  const listItem = getSubmissionListItem(id, submissionId);
  const review = getSubmissionReview(id, submissionId);

  if (!listItem || !review) notFound();

  return (
    <CoursePageShell eyebrow="Review" title="Review jawaban" description={review.examTitle} hideHeader>
      <Reveal>
        <div className="mb-4">
          <Button
            asChild
            variant="outline"
            className="interactive rounded-md border-border/80 text-muted-foreground hover:text-foreground"
          >
            <Link href={`/courses/${id}/my-results`}>Kembali ke hasil</Link>
          </Button>
        </div>

        <ReviewClient courseId={id} listItem={listItem} review={review} />
      </Reveal>
    </CoursePageShell>
  );
}
