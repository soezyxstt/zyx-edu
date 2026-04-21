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

type TryoutFormProps = {
  courseId: string;
  exam: ExamFixture;
};

export function TryoutForm({ courseId, exam }: TryoutFormProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() => {
    const init: Record<string, AnswerState> = {};
    for (const q of exam.questions) init[q.id] = emptyAnswer(q);
    return init;
  });

  const sorted = useMemo(
    () => [...exam.questions].sort((a, b) => a.order - b.order),
    [exam.questions],
  );

  function setAnswerFor(id: string, next: AnswerState) {
    setAnswers((prev) => ({ ...prev, [id]: next }));
  }

  function handleSubmit() {
    toast.success("Tryout dikirim (preview — esai memerlukan penilaian pengajar).");
    router.push(`/courses/${courseId}/my-results`);
  }

  return (
    <form
      className="space-y-10"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <div className="rounded-2xl border border-border bg-muted/20 px-4 py-3 text-body-sm text-muted-foreground">
        Bacalah setiap pertanyaan dengan sempurna. Nomor mengikuti urutan resmi. Lampiran
        bersifat opsional kecuali dinyatakan lain.
      </div>

      <ol className="space-y-12">
        {sorted.map((q, idx) => {
          const ans = answers[q.id];
          return (
            <li
              key={q.id}
              className="border-l-4 border-brand-primary/50 pl-6 md:pl-8"
            >
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
                <div className="flex gap-3">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-body-sm font-bold text-primary-foreground"
                    aria-hidden
                  >
                    {idx + 1}
                  </span>
                  <h2 className="font-heading text-h6 font-semibold text-foreground md:text-h5">
                    {q.prompt}
                  </h2>
                </div>

                {q.type === "multiple_choice" && ans.type === "multiple_choice" ? (
                  <fieldset className="mt-6 space-y-2">
                    <legend className="sr-only">Pilih satu jawaban</legend>
                    {q.options.map((opt, i) => (
                      <label
                        key={i}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:bg-muted/40",
                          ans.index === i && "border-primary bg-primary/5",
                        )}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          checked={ans.index === i}
                          onChange={() =>
                            setAnswerFor(q.id, { type: "multiple_choice", index: i })
                          }
                          className="size-4 accent-primary"
                        />
                        <span className="text-body-base text-foreground">{opt}</span>
                      </label>
                    ))}
                  </fieldset>
                ) : null}

                {q.type === "multiple_choices" && ans.type === "multiple_choices" ? (
                  <fieldset className="mt-6 space-y-2">
                    <legend className="sr-only">Pilih semua yang berlaku</legend>
                    {q.options.map((opt, i) => {
                      const checked = ans.indices.includes(i);
                      return (
                        <label
                          key={i}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:bg-muted/40",
                            checked && "border-primary bg-primary/5",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = checked
                                ? ans.indices.filter((x) => x !== i)
                                : [...ans.indices, i].sort((a, b) => a - b);
                              setAnswerFor(q.id, { type: "multiple_choices", indices: next });
                            }}
                            className="size-4 accent-primary"
                          />
                          <span className="text-body-base text-foreground">{opt}</span>
                        </label>
                      );
                    })}
                  </fieldset>
                ) : null}

                {q.type === "short_answer" && ans.type === "short_answer" ? (
                  <div className="mt-6">
                    <label className="block">
                      <span className="mb-2 block text-body-sm font-medium text-muted-foreground">
                        Jawaban
                      </span>
                      <textarea
                        value={ans.text}
                        onChange={(e) =>
                          setAnswerFor(q.id, { ...ans, text: e.target.value })
                        }
                        rows={5}
                        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-body-base focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      />
                    </label>
                    {q.acceptsImage ? (
                      <label className="mt-4 block text-body-sm">
                        <span className="font-medium text-foreground">Lampiran gambar</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="mt-2 block w-full text-body-sm text-muted-foreground"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            setAnswerFor(q.id, { ...ans, fileName: f?.name ?? null });
                          }}
                        />
                      </label>
                    ) : null}
                  </div>
                ) : null}

                {q.type === "essay" && ans.type === "essay" ? (
                  <div className="mt-6 space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-body-sm font-medium text-muted-foreground">
                        Esai
                      </span>
                      <textarea
                        value={ans.text}
                        onChange={(e) =>
                          setAnswerFor(q.id, { ...ans, text: e.target.value })
                        }
                        rows={8}
                        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-body-base leading-relaxed focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        placeholder="Tulis jawaban esai di sini…"
                      />
                    </label>
                    {q.acceptsFile ? (
                      <label className="block rounded-xl border border-dashed border-border bg-muted/20 p-4">
                        <span className="text-body-sm font-medium text-foreground">
                          Unggah berkas pendukung (PDF / gambar)
                        </span>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          className="mt-2 block w-full text-body-sm"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            setAnswerFor(q.id, { ...ans, fileName: f?.name ?? null });
                          }}
                        />
                        {ans.fileName ? (
                          <p className="mt-2 text-body-sm text-muted-foreground">{ans.fileName}</p>
                        ) : null}
                      </label>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-8">
        <Button type="button" variant="outline" className="rounded-full" onClick={() => router.back()}>
          Batal
        </Button>
        <Button type="submit" className="rounded-full">
          Kirim tryout
        </Button>
      </div>
    </form>
  );
}
