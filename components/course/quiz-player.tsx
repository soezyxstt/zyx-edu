"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  const sorted = useMemo(
    () => [...exam.questions].sort((a, b) => a.order - b.order),
    [exam.questions],
  );
  const q = sorted[index];
  const progress = ((index + 1) / sorted.length) * 100;

  function setAnswerFor(id: string, next: AnswerState) {
    setAnswers((prev) => ({ ...prev, [id]: next }));
  }

  function goNext() {
    if (index < sorted.length - 1) setIndex((i) => i + 1);
  }

  function goPrev() {
    if (index > 0) setIndex((i) => i - 1);
  }

  function handleSubmit() {
    toast.success("Jawaban terkirim (preview — belum ke submissions API).");
    router.push(`/courses/${courseId}/my-results`);
  }

  const ans = answers[q.id];

  return (
    <div className="space-y-6">
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-linear-to-r from-brand-primary to-tertiary-1 transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-body-sm font-medium text-muted-foreground">
        Soal {index + 1} / {sorted.length}
        {exam.settings?.timeLimitMinutes != null
          ? ` · saran waktu ${exam.settings.timeLimitMinutes} menit total`
          : ""}
      </p>

      <div
        className={cn(
          "rounded-3xl border-2 border-border bg-card p-6 shadow-lg md:p-10",
          "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
        )}
      >
        <h2 className="font-heading text-h5 font-bold text-foreground md:text-h4">{q.prompt}</h2>

        {q.type === "short_answer" && ans.type === "short_answer" ? (
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="sr-only">Jawaban singkat</span>
              <textarea
                value={ans.text}
                onChange={(e) =>
                  setAnswerFor(q.id, { ...ans, text: e.target.value })
                }
                rows={4}
                className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-body-base text-foreground shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                placeholder="Tulis jawabanmu…"
              />
            </label>
            {q.acceptsImage ? (
              <label className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-dashed border-border bg-muted/30 p-4">
                <span className="text-body-sm font-medium text-foreground">
                  Unggah gambar (opsional)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="text-body-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-body-sm file:font-medium file:text-primary-foreground"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setAnswerFor(q.id, {
                      ...ans,
                      fileName: f?.name ?? null,
                    });
                  }}
                />
                {ans.fileName ? (
                  <span className="text-body-sm text-muted-foreground">{ans.fileName}</span>
                ) : null}
              </label>
            ) : null}
          </div>
        ) : null}

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
                      "flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left text-body-base font-medium transition-all",
                      selected
                        ? "border-brand-primary bg-brand-primary/10 scale-[1.02] shadow-md"
                        : "border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl text-body-sm font-bold",
                        selected ? "bg-brand-primary text-primary-foreground" : "bg-muted text-foreground",
                      )}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-foreground">{opt}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        {q.type === "multiple_choices" && ans.type === "multiple_choices" ? (
          <ul className="mt-8 space-y-3">
            {q.options.map((opt, i) => {
              const selected = ans.indices.includes(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => {
                      const next = selected
                        ? ans.indices.filter((x) => x !== i)
                        : [...ans.indices, i].sort((a, b) => a - b);
                      setAnswerFor(q.id, { type: "multiple_choices", indices: next });
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left text-body-base font-medium transition-all",
                      selected
                        ? "border-tertiary-1 bg-tertiary-1/10 shadow-md"
                        : "border-border bg-muted/20 hover:border-tertiary-1/40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-lg border-2 text-body-sm",
                        selected
                          ? "border-tertiary-1 bg-tertiary-1 text-primary-foreground"
                          : "border-muted-foreground/30",
                      )}
                      aria-hidden
                    >
                      {selected ? "✓" : ""}
                    </span>
                    <span>{opt}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={goPrev}
          disabled={index === 0}
        >
          Sebelumnya
        </Button>
        <div className="flex gap-2">
          {index < sorted.length - 1 ? (
            <Button type="button" className="rounded-full" onClick={goNext}>
              Lanjut
            </Button>
          ) : (
            <Button type="button" className="rounded-full" onClick={handleSubmit}>
              Kirim jawaban
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
