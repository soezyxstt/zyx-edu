import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, HelpCircle, X } from "lucide-react";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { courseCardClass } from "@/components/course/course-surfaces";
import { Button } from "@/components/ui/button";
import { pageTitle } from "@/lib/site";
import { cn } from "@/lib/utils";
import {
  getCourseById,
  getSubmissionListItem,
  getSubmissionReview,
} from "@/lib/student-course-fixtures";

type Props = { params: Promise<{ id: string; submissionId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, submissionId } = await params;
  const course = getCourseById(id);
  const sub = getSubmissionListItem(id, submissionId);
  return {
    title: pageTitle(course && sub ? `${course.title} — Review: ${sub.examTitle}` : "Review"),
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
    <CoursePageShell
      eyebrow="Review"
      title="Mode tinjau"
      description={`${review.examTitle} — ${listItem.score != null ? `Skor: ${listItem.score}%` : "Pending penilaian esai"}`}
    >
      <div className="mb-8">
        <Button
          asChild
          variant="outline"
          className="interactive rounded-full motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]"
        >
          <Link href={`/courses/${id}/my-results`}>← Kembali ke hasil</Link>
        </Button>
      </div>
      <ol className="space-y-5">
        {review.items.map((item, idx) => (
          <li key={item.questionId} className={courseCardClass()}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="font-heading text-h6 font-semibold text-foreground">
                <span className="text-muted-foreground">{idx + 1}.</span> {item.prompt}
              </h2>
              {item.correct === true ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-status-success/12 px-2.5 py-0.5 text-body-sm font-medium text-status-success ring-1 ring-status-success/20">
                  <Check className="size-4" aria-hidden /> Benar
                </span>
              ) : item.correct === false ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-status-error/12 px-2.5 py-0.5 text-body-sm font-medium text-status-error ring-1 ring-status-error/20">
                  <X className="size-4" aria-hidden /> Salah
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-body-sm font-medium text-muted-foreground ring-1 ring-border/60">
                  <HelpCircle className="size-4" aria-hidden /> Menunggu dinilai
                </span>
              )}
            </div>
            <div className="mt-4 space-y-2 text-body-base">
              <p>
                <span className="font-medium text-foreground">Jawabanmu: </span>
                <span className="text-muted-foreground">{item.userAnswer || "—"}</span>
              </p>
              {item.correctAnswerLabel ? (
                <p>
                  <span className="font-medium text-foreground">Kunci / jawaban: </span>
                  <span className="text-muted-foreground">{item.correctAnswerLabel}</span>
                </p>
              ) : null}
              {item.teacherNote ? (
                <p
                  className={cn(
                    "rounded-xl border border-border/80 bg-muted/35 p-4 text-body-sm backdrop-blur-sm",
                  )}
                >
                  <span className="font-semibold text-foreground">Catatan pengajar: </span>
                  {item.teacherNote}
                </p>
              ) : item.questionType === "essay" && !item.teacherNote ? (
                <p className="text-body-sm text-muted-foreground italic">
                  Catatan pengajar akan muncul setelah penilaian.
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </CoursePageShell>
  );
}
