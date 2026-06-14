"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  Loader2,
  TrendingDown,
  TriangleAlert,
  ArrowRight,
  Layers,
  ListChecks,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/course/math-text";
import { cn } from "@/lib/utils";

interface QuestionSnapshot {
  id: string;
  prompt: string;
  options: string[];
  correct_indices: number[];
  type?: string;
}

interface AttemptData {
  id: string;
  templateId: string;
  score: number;
  durationSeconds: number | null;
  status: string;
  questionsSnapshot: QuestionSnapshot[];
  answersSnapshot: Record<string, number[]>;
  submittedAt: string;
  strongAreas: string[] | null;
  weakAreas: string[] | null;
  recommendedNextSteps: Array<{
    id: string;
    kind: "flashcards" | "quiz" | "module";
    title: string;
    count?: number;
    href: string;
  }> | null;
  feedback: Array<{
    questionIndex: number;
    payload: {
      whyWrong: string;
      misconceptionName?: string | null;
      correctApproach: string[];
      reviewHref: string;
    };
  }>;
}

const KIND_ICON = {
  flashcards: Layers,
  quiz: ListChecks,
  module: BookOpen,
};

export function AttemptReview({ attemptId }: { attemptId: string }) {
  const [pollCount, setPollCount] = useState(0);
  const [openFeedback, setOpenFeedback] = useState<Record<number, boolean>>({});

  const { data: attempt, error, refetch, isFetching } = useQuery<AttemptData>({
    queryKey: ["quiz-attempt", attemptId],
    queryFn: async () => {
      const res = await fetch(`/api/quiz/attempts/${attemptId}`);
      if (!res.ok) throw new Error("Gagal memuat data pembahasan");
      return res.json();
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 3000;

      // Count incorrect questions
      let incorrectCount = 0;
      data.questionsSnapshot.forEach((q) => {
        const submitted = data.answersSnapshot[q.id] ?? [];
        const isCorrect =
          submitted.length === q.correct_indices.length &&
          submitted.every((i) => q.correct_indices.includes(i));
        if (!isCorrect) incorrectCount++;
      });

      // Stop if all wrong answers have feedback
      if (data.feedback && data.feedback.length >= incorrectCount) {
        return false;
      }

      // Max 30 seconds (10 poll attempts of 3s)
      if (pollCount >= 10) {
        return false;
      }

      return 3000;
    },
  });

  // Track the poll count increment
  useEffect(() => {
    if (isFetching && attempt) {
      let incorrectCount = 0;
      attempt.questionsSnapshot.forEach((q) => {
        const submitted = attempt.answersSnapshot[q.id] ?? [];
        const isCorrect =
          submitted.length === q.correct_indices.length &&
          submitted.every((i) => q.correct_indices.includes(i));
        if (!isCorrect) incorrectCount++;
      });

      const feedbackCount = attempt.feedback?.length ?? 0;
      if (feedbackCount < incorrectCount && pollCount < 10) {
        const timer = setTimeout(() => {
          setPollCount((c) => c + 1);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [isFetching, attempt, pollCount]);

  if (error) {
    return (
      <div className="flex items-center gap-2 py-4 text-status-error text-body-sm">
        <TriangleAlert className="size-4" />
        <span>Gagal memuat pembahasan.</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setPollCount(0);
            refetch();
          }}
        >
          Coba Lagi
        </Button>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="space-y-4">
        <div className="h-16 bg-muted rounded-md animate-pulse" />
        <div className="h-40 bg-muted rounded-md animate-pulse" />
      </div>
    );
  }

  const { questionsSnapshot, answersSnapshot, score, feedback, strongAreas, weakAreas, recommendedNextSteps } = attempt;

  // Grade stats
  let correctCount = 0;
  questionsSnapshot.forEach((q) => {
    const submitted = answersSnapshot[q.id] ?? [];
    const isCorrect =
      submitted.length === q.correct_indices.length &&
      submitted.every((i) => q.correct_indices.includes(i));
    if (isCorrect) correctCount++;
  });
  const totalCount = questionsSnapshot.length;

  // Compute if feedback is still pending
  const incorrectCount = totalCount - correctCount;
  const isFeedbackPending = (feedback?.length ?? 0) < incorrectCount && pollCount < 10;
  const isFeedbackTimeout = (feedback?.length ?? 0) < incorrectCount && pollCount >= 10;

  const toggleFeedback = (idx: number) => {
    setOpenFeedback((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div>
        <h2 className="font-heading text-h3 font-bold text-foreground">
          {score}
          <span className="text-body-sm font-normal text-muted-foreground ml-1">/100</span>
        </h2>
        <p className="text-body-sm text-muted-foreground mt-1">
          {correctCount} dari {totalCount} benar
        </p>
      </div>

      {/* Strong / Weak Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
        <div>
          <span className="text-body-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Kekuatan Anda
          </span>
          <ul className="mt-2 space-y-1 text-body-base">
            {strongAreas && strongAreas.length > 0 ? (
              strongAreas.map((area, idx) => <li key={idx}>{area}</li>)
            ) : (
              <li className="text-muted-foreground text-body-sm">Belum ada konsep yang dikuasai sepenuhnya.</li>
            )}
          </ul>
        </div>
        <div>
          <span className="text-body-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Perlu Latihan
          </span>
          <ul className="mt-2 space-y-1 text-body-base">
            {weakAreas && weakAreas.length > 0 ? (
              weakAreas.map((area, idx) => (
                <li key={idx} className="flex items-center gap-1.5">
                  <TrendingDown className="size-3.5 text-status-error" />
                  <span>{area}</span>
                </li>
              ))
            ) : (
              <li className="text-muted-foreground text-body-sm">Kerja bagus! Tidak ada konsep yang lemah.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Questions List */}
      <div className="divide-y divide-border mt-8">
        {questionsSnapshot.map((q, idx) => {
          const submitted = answersSnapshot[q.id] ?? [];
          const isCorrect =
            submitted.length === q.correct_indices.length &&
            submitted.every((i) => q.correct_indices.includes(i));

          const fbItem = feedback?.find((f) => f.questionIndex === idx);
          const hasFb = !!fbItem;

          // Resolve choice option labels
          const submittedLabel = submitted.map((i) => q.options[i] ?? `Opsi ${i}`).join(", ");
          const correctLabel = q.correct_indices.map((i) => q.options[i] ?? `Opsi ${i}`).join(", ");

          return (
            <div key={q.id} className="py-6 first:pt-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-body-sm font-semibold text-muted-foreground">Soal {idx + 1}</span>
                  <div className="mt-2 text-body-base font-medium text-foreground">
                    <MathText>{q.prompt}</MathText>
                  </div>
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-md border",
                    isCorrect
                      ? "bg-status-success/10 text-status-success border-status-success/20"
                      : "bg-status-error/10 text-status-error border-status-error/20"
                  )}
                >
                  {isCorrect ? "Benar" : "Salah"}
                </span>
              </div>

              {/* Answers */}
              <div className="mt-4 space-y-1 pl-4 border-l-2 border-muted text-body-sm">
                <p>
                  <span className="text-muted-foreground">Jawaban Anda: </span>
                  <span className="font-medium">{submittedLabel || "-"}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Jawaban Benar: </span>
                  <span className="text-status-success font-semibold">{correctLabel}</span>
                </p>
              </div>

              {/* Mistake feedback */}
              {!isCorrect && (
                <div className="mt-4">
                  {hasFb ? (
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFeedback(idx)}
                        className="text-body-sm font-medium flex items-center gap-1 text-muted-foreground hover:text-foreground p-0 h-auto"
                      >
                        <ChevronDown
                          className={cn(
                            "size-4 transition-transform duration-200",
                            openFeedback[idx] && "rotate-180"
                          )}
                        />
                        <span>Mengapa jawaban saya salah?</span>
                      </Button>

                      {openFeedback[idx] && (
                        <div className="animate-in fade-in duration-200 mt-3 pl-4 border-l-2 border-status-error/40 space-y-3">
                          {fbItem.payload.misconceptionName && (
                            <h6 className="text-body-sm font-semibold text-foreground">
                              Miskonsep: {fbItem.payload.misconceptionName}
                            </h6>
                          )}
                          <p className="text-body-base text-muted-foreground">
                            {fbItem.payload.whyWrong}
                          </p>
                          {fbItem.payload.correctApproach && fbItem.payload.correctApproach.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-body-sm font-semibold text-foreground">Langkah Penyelesaian:</span>
                              <ol className="list-decimal pl-4 space-y-1 text-body-sm text-muted-foreground">
                                {fbItem.payload.correctApproach.map((stepMsg, sIdx) => (
                                  <li key={sIdx}>{stepMsg}</li>
                                ))}
                              </ol>
                            </div>
                          )}
                          <Link
                            href={fbItem.payload.reviewHref}
                            className="inline-flex items-center text-primary text-body-sm hover:underline mt-1"
                          >
                            Tinjau Konsep Ini
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : isFeedbackPending ? (
                    <div className="flex items-center gap-2 text-body-sm text-muted-foreground mt-2">
                      <Loader2 className="animate-spin size-3.5 text-primary" />
                      <span>Menganalisis kesalahan...</span>
                    </div>
                  ) : isFeedbackTimeout ? (
                    <div className="flex items-center gap-2 py-2 text-status-error text-body-sm">
                      <TriangleAlert className="size-4" />
                      <span>Gagal memuat penjelasan otomatis.</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0"
                        onClick={() => {
                          setPollCount(0);
                          refetch();
                        }}
                      >
                        Coba Lagi
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Recommended Next Steps */}
      {recommendedNextSteps && recommendedNextSteps.length > 0 && (
        <div className="border-t border-border pt-8">
          <h3 className="font-heading text-h6 font-bold text-foreground">Rekomendasi Langkah Selanjutnya</h3>
          <ul className="divide-y divide-border mt-3">
            {recommendedNextSteps.map((item, index) => {
              const Icon = KIND_ICON[item.kind] || BookOpen;
              return (
                <li
                  key={item.id}
                  className="py-3 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="size-5 rounded-full border border-border flex items-center justify-center shrink-0">
                    <span className="text-body-xs font-bold">{index + 1}</span>
                  </div>
                  <Icon className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-body-base font-medium flex-1 min-w-0 truncate">
                    {item.title}
                  </span>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={item.href} aria-label={`Buka ${item.title}`}>
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
