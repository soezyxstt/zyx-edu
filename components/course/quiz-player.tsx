"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Flag, Timer, BookOpen, AlertCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { MarkdownRenderer } from "@/components/course/markdown-renderer";

type QuizPlayerProps = {
  courseId: string;
  exam: {
    id: string;
    title: string;
    questions: Array<{
      id: string;
      order: number;
      type: "multiple_choice";
      prompt: string;
      options: string[];
      correctIndex: number;
    }>;
    settings?: {
      timeLimitMinutes?: number;
    };
  };
  attemptId: string;
};

export function QuizPlayer({ courseId, exam, attemptId }: QuizPlayerProps) {
  const router = useRouter();
  const durationSeconds = (exam.settings?.timeLimitMinutes ?? 15) * 60;
  const timerStorageKey = useMemo(() => `zyx-quiz-timer-deadline-${attemptId}`, [attemptId]);
  
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(`zyx-quiz-answers-${attemptId}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          // ignore
        }
      }
    }
    return {};
  });
  
  // Flag state for "Ragu-ragu"
  const [flags, setFlags] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(`zyx-quiz-flags-${attemptId}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          // ignore
        }
      }
    }
    return {};
  });

  // Timer states
  const [timeLeft, setTimeLeft] = useState<number>(durationSeconds);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (isSubmitted || submitting) return;

    try {
      setSubmitting(true);
      window.localStorage.removeItem(timerStorageKey);
      window.localStorage.removeItem(`zyx-quiz-answers-${attemptId}`);
      window.localStorage.removeItem(`zyx-quiz-flags-${attemptId}`);

      // Transform answers to standard Record<string, number[]> format
      const formattedAnswers: Record<string, number[]> = {};
      for (const [qId, selectedIdx] of Object.entries(answers)) {
        formattedAnswers[qId] = [selectedIdx];
      }

      // Mark all unanswered questions as empty arrays
      for (const question of exam.questions) {
        if (formattedAnswers[question.id] === undefined) {
          formattedAnswers[question.id] = [];
        }
      }

      const res = await fetch(`/api/quiz/attempts/${attemptId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answers: formattedAnswers,
          durationSeconds: Math.max(0, durationSeconds - timeLeft),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal mengumpulkan kuis");
      }

      setIsSubmitted(true);
      toast.success("Kuis berhasil dikumpulkan! Mengarahkan ke pembahasan...");
      
      // Navigate to the review screen for this attempt
      router.replace(`/courses/${courseId}/quiz/${exam.id}?attemptId=${attemptId}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengumpulkan kuis. Silakan coba kembali.");
      setSubmitting(false);
    }
  }, [courseId, isSubmitted, submitting, router, timerStorageKey, attemptId, answers, durationSeconds, timeLeft, exam.id, exam.questions]);

  useEffect(() => {
    const rawDeadline = window.localStorage.getItem(timerStorageKey);
    const storedDeadline = rawDeadline ? Number(rawDeadline) : NaN;
    const now = Date.now();
    let nextTimeLeft = durationSeconds;

    if (Number.isFinite(storedDeadline)) {
      nextTimeLeft = Math.max(0, Math.ceil((storedDeadline - now) / 1000));
    } else {
      const deadline = now + durationSeconds * 1000;
      window.localStorage.setItem(timerStorageKey, String(deadline));
    }

    const syncTimer = window.setTimeout(() => setTimeLeft(nextTimeLeft), 0);
    return () => window.clearTimeout(syncTimer);
  }, [durationSeconds, timerStorageKey]);

  useEffect(() => {
    if (isSubmitted || submitting) return;

    const timer = setInterval(() => {
      const deadline = Number(window.localStorage.getItem(timerStorageKey));
      const remaining = Number.isFinite(deadline)
        ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
        : 0;

      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        toast.warning("Waktu habis! Jawaban Anda otomatis terkirim.");
        handleSubmit();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [handleSubmit, isSubmitted, submitting, timerStorageKey]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const sorted = useMemo(
    () => [...exam.questions].sort((a, b) => a.order - b.order),
    [exam.questions],
  );

  const q = sorted[index];
  const progress = sorted.length > 0 ? ((index + 1) / sorted.length) * 100 : 0;

  function selectOption(qId: string, optionIndex: number) {
    if (isSubmitted || submitting) return;
    const next = { ...answers, [qId]: optionIndex };
    setAnswers(next);
    window.localStorage.setItem(`zyx-quiz-answers-${attemptId}`, JSON.stringify(next));
  }

  function toggleFlag(qId: string) {
    if (isSubmitted || submitting) return;
    const next = { ...flags, [qId]: !flags[qId] };
    setFlags(next);
    window.localStorage.setItem(`zyx-quiz-flags-${attemptId}`, JSON.stringify(next));
  }

  function goNext() {
    if (index < sorted.length - 1) setIndex((i) => i + 1);
  }

  function goPrev() {
    if (index > 0) setIndex((i) => i - 1);
  }

  const isQuestionAnswered = (questionId: string) => {
    return answers[questionId] !== undefined && answers[questionId] !== null;
  };

  if (!q) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/15 py-10 text-center">
        <p className="text-body-sm text-muted-foreground">Tidak ada pertanyaan untuk kuis ini.</p>
      </div>
    );
  }

  const ans = answers[q.id];
  const currentFlagged = !!flags[q.id];

  return (
    <div className="grid grid-cols-1 items-start gap-6 font-sans lg:grid-cols-12">
      
      {/* LEFT COLUMN: Main player and Question details (8 cols on lg) */}
      <div className="space-y-5 lg:col-span-8">
        
        {/* Progress Bar & Header */}
        <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>PROGRES PENGERJAAN</span>
              <span>{Math.round(progress)}% ({index + 1} / {sorted.length} Soal)</span>
            </div>
            <div className="h-2 overflow-hidden rounded-md bg-muted">
              <div
                className="h-full rounded-md bg-linear-to-r from-brand-primary via-tertiary-1 to-brand-secondary transition-[width] duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-secondary/35 bg-brand-secondary/10 px-3 py-1.5 font-mono text-body-sm font-bold text-brand-secondary">
            <Timer className="size-4 animate-pulse" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Question Area Box */}
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border border-border/85 bg-card p-5 shadow-xs backdrop-blur-xs md:p-6",
            "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
            currentFlagged && "ring-1 ring-brand-secondary/35 border-brand-secondary/40"
          )}
        >
          {/* Heading */}
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary text-body-sm font-bold text-white shadow-xs">
              {index + 1}
            </span>
            <div className="space-y-1 flex-1 leading-relaxed text-foreground">
              <div className="font-heading text-body-lg font-bold leading-normal">
                <MarkdownRenderer content={q.prompt} />
              </div>
            </div>
          </div>

          {/* Options Display */}
          <ul className="mt-5 space-y-2.5">
            {q.options.map((opt, i) => {
              const selected = ans === i;
              return (
                <li key={i}>
                  <button
                    type="button"
                    disabled={submitting || isSubmitted}
                    onClick={() => selectOption(q.id, i)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-body-sm font-medium transition-all duration-200 cursor-pointer disabled:cursor-not-allowed",
                      selected
                        ? "border-brand-primary bg-brand-primary/10 shadow-sm"
                        : "border-border/80 bg-background hover:border-brand-primary/45 hover:bg-muted/30"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full text-body-xs font-bold transition-colors",
                        selected ? "bg-brand-primary text-white" : "bg-muted text-foreground",
                      )}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <div className="text-foreground leading-normal flex-1">
                      <MarkdownRenderer content={opt} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Flagging Option Widget inside Card */}
          <div className="mt-5 flex items-center justify-between border-t border-border/80 pt-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                disabled={submitting || isSubmitted}
                checked={currentFlagged}
                onChange={() => toggleFlag(q.id)}
                className="size-4 rounded-sm border-border text-brand-secondary accent-brand-secondary focus:ring-brand-secondary cursor-pointer"
              />
              <span className={cn(
                "text-body-xs font-semibold flex items-center gap-1 transition-colors",
                currentFlagged ? "text-brand-secondary" : "text-muted-foreground hover:text-foreground"
              )}>
                <Flag className={cn("size-3.5", currentFlagged ? "fill-brand-secondary text-brand-secondary" : "")} />
                Ragu-ragu / Tandai Soal
              </span>
            </label>

            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <AlertCircle className="size-3 text-brand-primary" />
              Progress tersimpan otomatis
            </span>
          </div>
        </div>

        {/* Navigation Action Buttons */}
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            className="gap-1 border-border/80 rounded-md"
            onClick={goPrev}
            disabled={index === 0}
          >
            <ChevronLeft className="size-4" />
            Sebelumnya
          </Button>

          <div className="flex gap-2">
            {index < sorted.length - 1 ? (
              <Button type="button" className="gap-1 bg-foreground text-background hover:bg-foreground/90 px-6 rounded-md" onClick={goNext}>
                Lanjut
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                disabled={submitting || isSubmitted}
                className="bg-brand-primary text-white hover:bg-brand-primary/95 px-8 font-bold rounded-md"
                onClick={handleSubmit}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  "Kirim Jawaban"
                )}
              </Button>
            )}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Sidebar Question Grid & Info (4 cols on lg) */}
      <div className="space-y-5 lg:col-span-4 lg:border-l lg:border-border lg:pl-6">
        
        {/* Navigation Grid panel */}
        <div className="space-y-5">
          <div>
            <h3 className="font-heading text-body-sm font-bold text-foreground flex items-center gap-2">
              <BookOpen className="size-4 text-brand-primary" />
              Navigasi Pertanyaan
            </h3>
            <p className="text-body-xs text-muted-foreground mt-1">
              Lompat langsung ke soal dengan klik tombol angka di bawah:
            </p>
          </div>

          {/* Grid buttons list */}
          <div className="grid grid-cols-5 gap-2">
            {sorted.map((question, idx) => {
              const active = index === idx;
              const isAnswered = isQuestionAnswered(question.id);
              const isFlagged = !!flags[question.id];

              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setIndex(idx)}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg border font-heading text-body-xs font-bold transition-all cursor-pointer",
                    active
                      ? "border-brand-primary ring-2 ring-brand-primary/20 scale-105"
                      : "border-transparent",
                    isFlagged
                      ? "bg-brand-secondary/15 text-brand-secondary border-brand-secondary/60 hover:bg-brand-secondary/25"
                      : isAnswered
                      ? "bg-tertiary-1/15 text-tertiary-1 border-tertiary-1/50 hover:bg-tertiary-1/25"
                      : "bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted/80 hover:text-foreground"
                  )}
                  title={`Soal ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Legend indicator */}
          <div className="space-y-2 border-t border-border pt-4 text-body-xs">
            <span className="font-semibold text-foreground block">Keterangan Warna:</span>
            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded bg-muted/40 border border-border/50 shrink-0" />
                <span>Belum diisi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded bg-tertiary-1/15 border border-tertiary-1/50 shrink-0" />
                <span>Terjawab</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded bg-brand-secondary/15 border border-brand-secondary/60 shrink-0" />
                <span>Ragu-ragu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded border-2 border-brand-primary shrink-0" />
                <span>Aktif</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
