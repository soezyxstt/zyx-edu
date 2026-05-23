import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { pageTitle } from "@/lib/site";
import {
  getCourseById,
  getSubmissionListItem,
  getSubmissionReview,
} from "@/lib/student-course-fixtures";
import { ReviewClient } from "./review-client";

type Props = { params: Promise<{ id: string; submissionId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, submissionId } = await params;
  const course = getCourseById(id);
  const sub = getSubmissionListItem(id, submissionId);
  return {
    title: pageTitle(course && sub ? `${course.title} - Review: ${sub.examTitle}` : "Review"),
    description: "Tinjau jawaban dan catatan pengajar",
  };
}

export default async function SubmissionReviewPage({ params }: Props) {
  const { id, submissionId } = await params;
  const course = getCourseById(id);
  const listItem = getSubmissionListItem(id, submissionId);
  const review = getSubmissionReview(id, submissionId);

  if (!course || !listItem || !review) notFound();

  return (
    <CoursePageShell eyebrow="Review" title="Review jawaban" description={review.examTitle} hideHeader>
      <Reveal>
        <div className="mb-4">
          <Button
            asChild
            variant="outline"
            className="interactive rounded-full border-border/80 text-muted-foreground hover:text-foreground"
          >
            <Link href={`/courses/${id}/my-results`}>Kembali ke hasil</Link>
          </Button>
        </div>

        <ReviewClient courseId={id} listItem={listItem} review={review} />
      </Reveal>
    </CoursePageShell>
  );
}
