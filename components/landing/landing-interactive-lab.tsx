"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { CheckCircle2, CircleHelp, Code2, Languages, SlidersHorizontal, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionContainer } from "@/components/layout/section-container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DesmosGraphingEmbed } from "@/components/landing/desmos-graphing-embed";
import { VolumeOfRevolutionFallback } from "@/components/landing/volume-of-revolution-canvas";

const VolumeOfRevolutionCanvas = dynamic(
  () =>
    import("@/components/landing/volume-of-revolution-canvas").then((mod) => ({
      default: mod.VolumeOfRevolutionCanvas,
    })),
  { ssr: false, loading: VolumeOfRevolutionFallback }
);

type FunctionType = "revolution" | "quadratic" | "sine";
type Domain = "math" | "coding" | "language";

const quickQuestions: Record<Domain, Array<{ prompt: string; options: string[]; answer: string }>> = {
  math: [
    {
      prompt: "Jika 2x + 6 = 14, maka x = ?",
      options: ["2", "3", "4", "5"],
      answer: "4",
    },
    {
      prompt: "Luas lingkaran dengan r = 3 adalah ...",
      options: ["6pi", "9pi", "12pi", "18pi"],
      answer: "9pi",
    },
    {
      prompt: "Nilai tengah dari {2, 3, 7, 9, 12} adalah ...",
      options: ["5", "7", "9", "12"],
      answer: "7",
    },
  ],
  coding: [
    {
      prompt: "Manakah struktur data yang paling cocok untuk lookup cepat (rata-rata)?",
      options: ["Array", "Hash Map", "Linked List", "Queue"],
      answer: "Hash Map",
    },
    {
      prompt: "Pada JavaScript, hasil dari typeof null adalah …",
      options: ["null", "undefined", "object", "boolean"],
      answer: "object",
    },
    {
      prompt: "Kompleksitas waktu worst-case untuk pencarian biner pada array terurut adalah …",
      options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
      answer: "O(log n)",
    },
  ],
  language: [
    {
      prompt: "(Bahasa Inggris) Pilih kalimat yang paling natural:",
      options: ["She go to campus daily", "She goes to campus daily", "She going campus daily", "She gone campus daily"],
      answer: "She goes to campus daily",
    },
    {
      prompt: "(Bahasa Inggris) Sinonim terdekat dari kata \"brief\" adalah …",
      options: ["long", "short", "late", "empty"],
      answer: "short",
    },
    {
      prompt: "(Bahasa Inggris) Bentuk aktif yang paling tepat untuk \"The report was written by Ana\" adalah …",
      options: ["Ana written the report", "Ana writes report", "Ana wrote the report", "The report wrote Ana"],
      answer: "Ana wrote the report",
    },
  ],
};

const codingScenarios = [
  {
    title: "Pemetaan array",
    snippet: "const nums = [1, 2, 3];\nconsole.log(nums.map((n) => n * 2));",
    choices: ["[2, 4, 6]", "[1, 2, 3, 2, 4, 6]", "undefined"],
    answer: "[2, 4, 6]",
  },
  {
    title: "Referensi objek",
    snippet: "const a = { x: 1 };\nconst b = a;\nb.x = 4;\nconsole.log(a.x);",
    choices: ["1", "4", "undefined"],
    answer: "4",
  },
  {
    title: "Urutan async",
    snippet: "console.log('A');\nsetTimeout(() => console.log('B'), 0);\nconsole.log('C');",
    choices: ["A B C", "A C B", "B A C"],
    answer: "A C B",
  },
] as const;

const languageScenarios = [
  {
    prompt: "Betulkan kalimat:",
    sentence: "He don't has enough time for finish the task.",
    choices: [
      "He doesn't have enough time to finish the task.",
      "He don't have enough time finishing the task.",
      "He doesn't has enough time for finish task.",
    ],
    answer: "He doesn't have enough time to finish the task.",
  },
  {
    prompt: "Pilih kalimat email paling sopan dan jelas:",
    sentence: "Konteks: meminta tambahan waktu tugas kepada dosen.",
    choices: [
      "Can you maybe move deadline if possible?",
      "Could I request a two-day extension for the assignment due tomorrow?",
      "I need extension because many tasks.",
    ],
    answer: "Could I request a two-day extension for the assignment due tomorrow?",
  },
  {
    prompt: "Pilih parafrasa terbaik:",
    sentence: "Asli (EN): The app frequently crashes when users upload large files.",
    choices: [
      "The application often fails during large-file uploads.",
      "Users like uploading large files in the app.",
      "The app has files and users.",
    ],
    answer: "The application often fails during large-file uploads.",
  },
] as const;

export function LandingInteractiveLab() {
  const [domain, setDomain] = useState<Domain>("math");
  const [functionType, setFunctionType] = useState<FunctionType>("revolution");
  const [a, setA] = useState(1);
  const [b, setB] = useState(1);
  const [c, setC] = useState(0);
  const [codingScenarioIndex, setCodingScenarioIndex] = useState(0);
  const [codingAnswer, setCodingAnswer] = useState<string | null>(null);
  const [languageScenarioIndex, setLanguageScenarioIndex] = useState(0);
  const [languageAnswer, setLanguageAnswer] = useState<string | null>(null);

  const [activeQuestion, setActiveQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const domainQuestions = quickQuestions[domain];
  const currentQuestion = domainQuestions[activeQuestion];
  const isCorrect = selectedAnswer === currentQuestion.answer;
  const codingScenario = codingScenarios[codingScenarioIndex];
  const codingCorrect = codingAnswer === codingScenario.answer;
  const languageScenario = languageScenarios[languageScenarioIndex];
  const languageCorrect = languageAnswer === languageScenario.answer;

  return (
    <SectionContainer
      density="compact"
      className="border-y border-border/80 bg-[var(--color-surface)]"
      contentClassName="min-w-0 max-w-full overflow-x-clip"
      aria-labelledby="interactive-lab-heading"
    >
        <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
          <Badge
            variant="secondary"
            className="border border-[var(--zx-accent)]/35 bg-[var(--zx-accent)]/10 px-3 py-1 text-xs font-medium tracking-widest uppercase text-[var(--zx-accent)]"
          >
            Interactive Playground
          </Badge>
          <SectionHeading id="interactive-lab-heading" tier="secondary" className="mt-2 text-foreground">
            Belajar sambil eksplorasi langsung
          </SectionHeading>
          <p className="mt-3 max-w-prose text-body-md text-muted-foreground">
            Bukan cuma matematika: coba mode STEM, coding, dan language dalam satu playground interaktif.
          </p>
        </div>

        <Tabs
          defaultValue="math"
          value={domain}
          onValueChange={(value) => {
            const next = value as Domain;
            setDomain(next);
            setActiveQuestion(0);
            setSelectedAnswer(null);
            setCodingAnswer(null);
            setLanguageAnswer(null);
          }}
          className="relative z-10 mb-8"
        >
          <TabsList className="grid h-auto min-h-0 w-full grid-cols-1 gap-3 bg-transparent p-0 md:grid-cols-3">
            <TabsTrigger
              value="math"
              className="h-auto min-h-10 w-full min-w-0 flex-wrap gap-2 whitespace-normal border border-border bg-card py-2.5 outline-none ring-offset-background data-[state=active]:border-[var(--zx-accent)] data-[state=active]:bg-[var(--zx-accent)]/10 data-[state=active]:text-foreground data-[state=active]:ring-2 data-[state=active]:ring-[var(--zx-accent)]"
            >
              <SlidersHorizontal className="size-4 shrink-0" />
              Matematika &amp; sains
            </TabsTrigger>
            <TabsTrigger
              value="coding"
              className="h-auto min-h-10 w-full min-w-0 flex-wrap gap-2 whitespace-normal border border-border bg-card py-2.5 outline-none ring-offset-background data-[state=active]:border-[var(--zx-accent)] data-[state=active]:bg-[var(--zx-accent)]/10 data-[state=active]:text-foreground data-[state=active]:ring-2 data-[state=active]:ring-[var(--zx-accent)]"
            >
              <Code2 className="size-4 shrink-0" />
              Logika pemrograman
            </TabsTrigger>
            <TabsTrigger
              value="language"
              className="h-auto min-h-10 w-full min-w-0 flex-wrap gap-2 whitespace-normal border border-border bg-card py-2.5 outline-none ring-offset-background data-[state=active]:border-[var(--zx-accent)] data-[state=active]:bg-[var(--zx-accent)]/10 data-[state=active]:text-foreground data-[state=active]:ring-2 data-[state=active]:ring-[var(--zx-accent)]"
            >
              <Languages className="size-4 shrink-0" />
              Bahasa Inggris
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <article className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
            <div className="mb-5 flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
              <div className="inline-flex max-w-full min-w-0 flex-wrap items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-body-sm font-semibold text-primary">
                {domain === "math" ? (
                  <SlidersHorizontal className="size-4 shrink-0" />
                ) : domain === "coding" ? (
                  <Code2 className="size-4 shrink-0" />
                ) : (
                  <Languages className="size-4 shrink-0" />
                )}
                <span className="min-w-0 wrap-break-word">
                  {domain === "math"
                    ? "Eksplor fungsi"
                    : domain === "coding"
                      ? "Cuplikan kode interaktif"
                      : "Latihan struktur kalimat"}
                </span>
              </div>
              <div className="inline-flex w-fit max-w-full shrink-0 items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-body-sm text-muted-foreground">
                <Sparkles className="size-3.5 shrink-0" aria-hidden />
                Pembaruan langsung
              </div>
            </div>

            {domain === "math" ? (
              <>
                <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {(["revolution", "quadratic", "sine"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFunctionType(type)}
                      className={cn(
                        "min-w-0 rounded-xl border px-3 py-2 text-center text-body-sm font-semibold whitespace-normal transition-colors sm:text-left",
                        functionType === type
                          ? "border-[var(--zx-accent)] bg-[var(--zx-accent)]/15 text-foreground ring-2 ring-[var(--zx-accent)] ring-offset-2 ring-offset-background"
                          : "border-border bg-background text-foreground hover:bg-muted"
                      )}
                    >
                      {type === "revolution"
                        ? "Volume putar"
                        : type === "quadratic"
                          ? "Kuadratik"
                          : "Gelombang sinus"}
                    </button>
                  ))}
                </div>

                <div className="mb-6 min-w-0 space-y-3">
                  <label className="block min-w-0 max-w-full text-body-sm font-medium text-foreground">
                    a ({a.toFixed(1)})
                    <input
                      type="range"
                      min={-4}
                      max={4}
                      step={0.1}
                      value={a}
                      onChange={(e) => setA(Number(e.target.value))}
                      className="mt-1.5 block w-full max-w-full min-w-0 accent-[var(--zx-accent)]"
                    />
                  </label>
                  <label className="block min-w-0 max-w-full text-body-sm font-medium text-foreground">
                    b ({b.toFixed(1)})
                    <input
                      type="range"
                      min={-3}
                      max={3}
                      step={0.1}
                      value={b}
                      onChange={(e) => setB(Number(e.target.value))}
                      className="mt-1.5 block w-full max-w-full min-w-0 accent-[var(--zx-accent)]"
                    />
                  </label>
                  <label className="block min-w-0 max-w-full text-body-sm font-medium text-foreground">
                    c ({c.toFixed(1)})
                    <input
                      type="range"
                      min={-4}
                      max={4}
                      step={0.1}
                      value={c}
                      onChange={(e) => setC(Number(e.target.value))}
                      className="mt-1.5 block w-full max-w-full min-w-0 accent-[var(--zx-accent)]"
                    />
                  </label>
                </div>

                <div className="max-w-full min-w-0 overflow-hidden rounded-xl border border-border bg-background shadow-sm">
                  {functionType === "revolution" ? (
                    <VolumeOfRevolutionCanvas a={a} b={b} c={c} />
                  ) : (
                    <DesmosGraphingEmbed mode={functionType} a={a} b={b} c={c} />
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {domain === "coding" ? (
                  <>
                    <div className="flex gap-2">
                      {codingScenarios.map((item, idx) => (
                        <button
                          key={item.title}
                          type="button"
                          onClick={() => {
                            setCodingScenarioIndex(idx);
                            setCodingAnswer(null);
                          }}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-body-sm transition-colors",
                            idx === codingScenarioIndex
                              ? "border-[var(--zx-accent)] bg-[var(--zx-accent)]/12 text-foreground ring-2 ring-[var(--zx-accent)]/35"
                              : "border-border bg-background text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="text-body-sm font-semibold text-foreground">{codingScenario.title}</p>
                      <pre className="mt-2 overflow-x-auto rounded-lg bg-black-2 p-3 text-body-sm text-white">
                        {codingScenario.snippet}
                      </pre>
                      <p className="mt-3 text-body-sm text-muted-foreground">Apa keluaran program tersebut?</p>
                      <div className="mt-2 space-y-2">
                        {codingScenario.choices.map((choice) => (
                          <button
                            key={choice}
                            type="button"
                            onClick={() => setCodingAnswer(choice)}
                            className={cn(
                              "w-full rounded-lg border px-3 py-2 text-left text-body-sm transition-colors",
                              codingAnswer === choice
                                ? choice === codingScenario.answer
                                  ? "border-status-success bg-status-success/10"
                                  : "border-status-error bg-status-error/10"
                                : "border-border bg-card hover:bg-muted"
                            )}
                          >
                            {choice}
                          </button>
                        ))}
                      </div>
                      <p className={cn("mt-3 text-body-sm font-medium", codingAnswer ? (codingCorrect ? "text-status-success" : "text-status-error") : "text-muted-foreground")}>
                        {codingAnswer
                          ? codingCorrect
                            ? "Benar — alur pembacaan kamu tepat."
                            : `Belum tepat. Output yang benar: ${codingScenario.answer}.`
                          : "Pilih jawaban untuk cek hasil."}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex gap-2">
                      {languageScenarios.map((item, idx) => (
                        <button
                          key={item.prompt}
                          type="button"
                          onClick={() => {
                            setLanguageScenarioIndex(idx);
                            setLanguageAnswer(null);
                          }}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-body-sm transition-colors",
                            idx === languageScenarioIndex
                              ? "border-[var(--zx-accent)] bg-[var(--zx-accent)]/12 text-foreground ring-2 ring-[var(--zx-accent)]/35"
                              : "border-border bg-background text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="text-body-sm font-semibold text-foreground">{languageScenario.prompt}</p>
                      <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-body-sm text-foreground">{languageScenario.sentence}</p>
                      <div className="mt-3 space-y-2">
                        {languageScenario.choices.map((choice) => (
                          <button
                            key={choice}
                            type="button"
                            onClick={() => setLanguageAnswer(choice)}
                            className={cn(
                              "w-full rounded-lg border px-3 py-2 text-left text-body-sm transition-colors",
                              languageAnswer === choice
                                ? choice === languageScenario.answer
                                  ? "border-status-success bg-status-success/10"
                                  : "border-status-error bg-status-error/10"
                                : "border-border bg-card hover:bg-muted"
                            )}
                          >
                            {choice}
                          </button>
                        ))}
                      </div>
                      <p className={cn("mt-3 text-body-sm font-medium", languageAnswer ? (languageCorrect ? "text-status-success" : "text-status-error") : "text-muted-foreground")}>
                        {languageAnswer
                          ? languageCorrect
                            ? "Pilihan tepat — kalimat ini paling jelas dan sopan untuk konteksnya."
                            : "Coba lagi — perhatikan tata bahasa dan pilihan kata yang lebih natural."
                          : "Pilih opsi untuk melihat umpan balik."}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </article>

          <article className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[var(--zx-accent)]/12 px-3 py-1 text-body-sm font-semibold text-[var(--zx-accent)]">
              <CircleHelp className="size-4 shrink-0" aria-hidden />
              {domain === "math"
                ? "Tantangan cepat matematika"
                : domain === "coding"
                  ? "Teka-teki logika kode"
                  : "Quiz bahasa Inggris"}
            </div>

            <div className="mb-5 flex gap-2">
              {domainQuestions.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActiveQuestion(idx);
                    setSelectedAnswer(null);
                  }}
                  className={cn(
                    "h-8 w-8 rounded-full border text-body-sm font-semibold transition-colors",
                    idx === activeQuestion
                      ? "border-[var(--zx-accent)] bg-[var(--zx-accent)] text-white"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                  aria-label={`Pertanyaan ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            <p className="mb-4 font-heading text-h6 font-semibold text-foreground">{currentQuestion.prompt}</p>
            <div className="space-y-2">
              {currentQuestion.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSelectedAnswer(option)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-left text-body-sm font-medium transition-colors",
                    selectedAnswer === option
                      ? option === currentQuestion.answer
                        ? "border-status-success bg-status-success/10 text-foreground"
                        : "border-status-error bg-status-error/10 text-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="mt-5 min-h-10 text-body-sm">
              {selectedAnswer ? (
                <p className={cn("inline-flex items-center gap-2 font-semibold", isCorrect ? "text-status-success" : "text-status-error")}>
                  <CheckCircle2 className="size-4" />
                  {isCorrect ? "Mantap, jawaban kamu benar." : `Belum tepat. Jawaban yang benar: ${currentQuestion.answer}.`}
                </p>
              ) : (
                <p className="text-muted-foreground">Pilih salah satu jawaban untuk melihat feedback instan.</p>
              )}
            </div>
          </article>
        </div>
    </SectionContainer>
  );
}
