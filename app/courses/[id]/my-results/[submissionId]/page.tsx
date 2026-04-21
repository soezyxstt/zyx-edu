import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, HelpCircle, X } from "lucide-react";
import { ShellPage } from "@/components/shell-page";
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
    title: pageTitle(
      course && sub ? `${course.title} — Review: ${sub.examTitle}` : "Review",
    ),
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
    <ShellPage
      title="Mode tinjau"
      description={`${review.examTitle} — ${listItem.score != null ? `Skor: ${listItem.score}%` : "Pending penilaian esai"}`}
    >
      <div className="mb-8">
        <Button asChild variant="outline" className="rounded-full">
          <Link href={`/courses/${id}/my-results`}>← Kembali ke hasil</Link>
        </Button>
      </div>
      <ol className="space-y-6">
        {review.items.map((item, idx) => (
          <li
            key={item.questionId}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="font-heading text-h6 font-semibold text-foreground">
                <span className="text-muted-foreground">{idx + 1}.</span> {item.prompt}
              </h2>
              {item.correct === true ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-status-success/15 px-2 py-0.5 text-body-sm font-medium text-status-success">
                  <Check className="size-4" aria-hidden /> Benar
                </span>
              ) : item.correct === false ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-status-error/15 px-2 py-0.5 text-body-sm font-medium text-status-error">
                  <X className="size-4" aria-hidden /> Salah
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-body-sm font-medium text-muted-foreground">
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
                    "rounded-xl border border-border bg-muted/40 p-4 text-body-sm",
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
    </ShellPage>
  );
}
