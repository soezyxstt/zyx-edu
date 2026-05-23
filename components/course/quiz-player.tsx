"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Flag, Timer, BookOpen, AlertCircle, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import type { ExamFixture, QuestionSpec } from "@/lib/student-course-fixtures";

type AnswerState =
  | { type: "short_answer"; text: string; fileName: string | null }
  | { type: "multiple_choice"; index: number | null }
  | { type: "multiple_choices"; indices: number[] }
  | { type: "essay"; text: string; fileName: string | null };

function emptyAnswer(q: QuestionSpec): AnswerState {
  if (q.type === "short_answer") return { type: "short_answer", text: "", fileName: null };
  if (q.type === "multiple_choice") return { type: "multiple_choice", index: null };
  if (q.type === "multiple_choices") return { type: "multiple_choices", indices: [] };
  return { type: "essay", text: "", fileName: null };
}

type QuizPlayerProps = {
  courseId: string;
  exam: ExamFixture;
};

export function QuizPlayer({ courseId, exam }: QuizPlayerProps) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() => {
    const init: Record<string, AnswerState> = {};
    for (const q of exam.questions) init[q.id] = emptyAnswer(q);
    return init;
  });
  
  // Flag state for "Ragu-ragu"
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  // Timer states
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    return (exam.settings?.timeLimitMinutes ?? 15) * 60;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.warning("Waktu habis! Jawaban Anda otomatis terkirim.");
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
  const progress = ((index + 1) / sorted.length) * 100;

  function setAnswerFor(id: string, next: AnswerState) {
    setAnswers((prev) => ({ ...prev, [id]: next }));
  }

  function toggleFlag(id: string) {
    setFlags((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function goNext() {
    if (index < sorted.length - 1) setIndex((i) => i + 1);
  }

  function goPrev() {
    if (index > 0) setIndex((i) => i - 1);
  }

  function handleSubmit() {
    // Generate mock submission ID
    const submissionId = `sub-calc-quiz-generated-${Date.now()}`;
    
    // Simulate submission to results history
    toast.success("Kuis berhasil dikumpulkan! Mengarahkan ke halaman hasil...");
    router.push(`/courses/${courseId}/my-results`);
  }

  // Determine if a question has been answered
  const isQuestionAnswered = (question: QuestionSpec) => {
    const ans = answers[question.id];
    if (!ans) return false;
    if (ans.type === "multiple_choice") return ans.index !== null;
    if (ans.type === "multiple_choices") return ans.indices.length > 0;
    if (ans.type === "short_answer" || ans.type === "essay") return ans.text.trim() !== "";
    return false;
  };

  const ans = answers[q.id];
  const currentFlagged = !!flags[q.id];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start font-sans">
      
      {/* LEFT COLUMN: Main player and Question details (9 cols on lg) */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Progress Bar & Header */}
        <div className="bg-card/50 border border-border/70 p-4 rounded-2xl flex items-center justify-between gap-4 backdrop-blur-xs">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between text-body-xs font-semibold text-muted-foreground">
              <span>PROGRES PENGERJAAN</span>
              <span>{Math.round(progress)}% ({index + 1} / {sorted.length} Soal)</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-linear-to-r from-brand-primary via-tertiary-1 to-brand-secondary transition-[width] duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1.5 bg-brand-secondary/10 border border-brand-secondary/35 text-brand-secondary px-3.5 py-1.5 rounded-xl font-mono text-body-sm font-bold animate-pulse">
            <Timer className="size-4" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Question Area Box */}
        <div
          className={cn(
            "rounded-3xl border border-border/80 bg-card p-6 shadow-lg backdrop-blur-xs md:p-8 relative overflow-hidden",
            "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
            currentFlagged && "ring-1 ring-brand-secondary/35 border-brand-secondary/40"
          )}
        >
          {/* Accent decoration */}
          <div className="absolute right-0 top-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-2xl pointer-events-none" />

          {/* Heading */}
          <div className="flex items-start gap-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-primary text-body-sm font-bold text-white shadow-xs">
              {index + 1}
            </span>
            <div className="space-y-1 flex-1">
              <h2 className="font-heading text-body-lg font-bold text-foreground leading-snug md:text-h5">
                {q.prompt}
              </h2>
            </div>
          </div>

          {/* Options Display (Multiple choice kuis mingguan) */}
          {q.type === "multiple_choice" && ans.type === "multiple_choice" ? (
            <ul className="mt-8 space-y-3">
              {q.options.map((opt, i) => {
                const selected = ans.index === i;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => setAnswerFor(q.id, { type: "multiple_choice", index: i })}
                      className={cn(
                        "flex w-full items-center gap-3.5 rounded-2xl border-2 px-5 py-4 text-left text-body-sm font-medium transition-all duration-200",
                        selected
                          ? "border-brand-primary bg-brand-primary/10 shadow-sm translate-x-1"
                          : "border-border/70 bg-muted/10 hover:border-brand-primary/40 hover:bg-muted/30"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-xl text-body-xs font-bold transition-colors",
                          selected ? "bg-brand-primary text-white" : "bg-muted text-foreground",
                        )}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="text-foreground leading-normal">{opt}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {/* Flagging Option Widget inside Card */}
          <div className="mt-8 border-t border-border/80 pt-5 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={currentFlagged}
                onChange={() => toggleFlag(q.id)}
                className="size-4 rounded-sm border-border text-brand-secondary accent-brand-secondary focus:ring-brand-secondary"
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
        <div className="flex items-center justify-between gap-3 bg-muted/20 p-4 rounded-2xl border border-border/60">
          <Button
            type="button"
            variant="outline"
            className="rounded-full gap-1 border-border/80"
            onClick={goPrev}
            disabled={index === 0}
          >
            <ChevronLeft className="size-4" />
            Sebelumnya
          </Button>

          <div className="flex gap-2">
            {index < sorted.length - 1 ? (
              <Button type="button" className="rounded-full gap-1 bg-foreground text-background hover:bg-foreground/90 px-6" onClick={goNext}>
                Lanjut
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button type="button" className="rounded-full bg-brand-primary text-white hover:bg-brand-primary/95 px-8 font-bold" onClick={handleSubmit}>
                Kirim Jawaban
              </Button>
            )}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Sidebar Question Grid & Info (4 cols on lg) */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Navigation Grid panel */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-md space-y-5">
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
          <div className="grid grid-cols-5 gap-2.5">
            {sorted.map((question, idx) => {
              const active = index === idx;
              const isAnswered = isQuestionAnswered(question);
              const isFlagged = !!flags[question.id];

              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setIndex(idx)}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl font-heading font-bold text-body-xs transition-all border-2",
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
          <div className="border-t border-border pt-4 space-y-2 text-body-xs">
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

        {/* Information box */}
        <div className="rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-4 flex items-start gap-3">
          <AlertCircle className="size-5 text-brand-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-body-xs font-bold text-foreground">Kuis Bersifat Kasual</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Kuis ini dirancang untuk latihan mingguan yang menyenangkan. Tidak perlu tegang, nilaimu akan tercatat langsung di halaman hasil dan dapat ditinjau kapan saja.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
