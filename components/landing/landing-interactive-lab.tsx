"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CircleHelp, Code2, Languages, SlidersHorizontal, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionContainer } from "@/components/layout/section-container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FunctionType = "quadratic" | "sine" | "absolute";
type Domain = "math" | "coding" | "language";

const graphWidth = 560;
const graphHeight = 280;
const xMin = -10;
const xMax = 10;
const yMin = -8;
const yMax = 8;

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
      prompt: "Manakah struktur data terbaik untuk lookup cepat?",
      options: ["Array", "Hash Map", "Linked List", "Queue"],
      answer: "Hash Map",
    },
    {
      prompt: "Output JavaScript: typeof null adalah ...",
      options: ["null", "undefined", "object", "boolean"],
      answer: "object",
    },
    {
      prompt: "Big-O untuk binary search pada data terurut adalah ...",
      options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
      answer: "O(log n)",
    },
  ],
  language: [
    {
      prompt: "Pilih kalimat paling natural:",
      options: ["She go to campus daily", "She goes to campus daily", "She going campus daily", "She gone campus daily"],
      answer: "She goes to campus daily",
    },
    {
      prompt: "Sinonim terdekat dari 'brief' adalah ...",
      options: ["long", "short", "late", "empty"],
      answer: "short",
    },
    {
      prompt: "Kalimat aktif dari 'The report was written by Ana' adalah ...",
      options: ["Ana written the report", "Ana writes report", "Ana wrote the report", "The report wrote Ana"],
      answer: "Ana wrote the report",
    },
  ],
};

const codingScenarios = [
  {
    title: "Array mapping",
    snippet: "const nums = [1, 2, 3];\nconsole.log(nums.map((n) => n * 2));",
    choices: ["[2, 4, 6]", "[1, 2, 3, 2, 4, 6]", "undefined"],
    answer: "[2, 4, 6]",
  },
  {
    title: "Object reference",
    snippet: "const a = { x: 1 };\nconst b = a;\nb.x = 4;\nconsole.log(a.x);",
    choices: ["1", "4", "undefined"],
    answer: "4",
  },
  {
    title: "Async order",
    snippet: "console.log('A');\nsetTimeout(() => console.log('B'), 0);\nconsole.log('C');",
    choices: ["A B C", "A C B", "B A C"],
    answer: "A C B",
  },
] as const;

const languageScenarios = [
  {
    prompt: "Fix the sentence:",
    sentence: "He don't has enough time for finish the task.",
    choices: [
      "He doesn't have enough time to finish the task.",
      "He don't have enough time finishing the task.",
      "He doesn't has enough time for finish task.",
    ],
    answer: "He doesn't have enough time to finish the task.",
  },
  {
    prompt: "Choose the clearest email line:",
    sentence: "Context: asking lecturer for an extension.",
    choices: [
      "Can you maybe move deadline if possible?",
      "Could I request a two-day extension for the assignment due tomorrow?",
      "I need extension because many tasks.",
    ],
    answer: "Could I request a two-day extension for the assignment due tomorrow?",
  },
  {
    prompt: "Pick the best paraphrase:",
    sentence: "Original: The app frequently crashes when users upload large files.",
    choices: [
      "The application often fails during large-file uploads.",
      "Users like uploading large files in the app.",
      "The app has files and users.",
    ],
    answer: "The application often fails during large-file uploads.",
  },
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mapX(x: number) {
  return ((x - xMin) / (xMax - xMin)) * graphWidth;
}

function mapY(y: number) {
  return ((yMax - y) / (yMax - yMin)) * graphHeight;
}

function buildPath(type: FunctionType, a: number, b: number, c: number) {
  const steps = 220;
  let path = "";

  for (let i = 0; i <= steps; i += 1) {
    const x = xMin + (i / steps) * (xMax - xMin);
    let y = 0;

    if (type === "quadratic") y = a * x * x + b * x + c;
    if (type === "sine") y = a * Math.sin(b * x) + c;
    if (type === "absolute") y = a * Math.abs(x - b) + c;

    y = clamp(y, yMin - 2, yMax + 2);

    const px = mapX(x);
    const py = mapY(y);
    path += i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`;
  }

  return path;
}

export function LandingInteractiveLab() {
  const [domain, setDomain] = useState<Domain>("math");
  const [functionType, setFunctionType] = useState<FunctionType>("sine");
  const [a, setA] = useState(1);
  const [b, setB] = useState(1);
  const [c, setC] = useState(0);
  const [codingScenarioIndex, setCodingScenarioIndex] = useState(0);
  const [codingAnswer, setCodingAnswer] = useState<string | null>(null);
  const [languageScenarioIndex, setLanguageScenarioIndex] = useState(0);
  const [languageAnswer, setLanguageAnswer] = useState<string | null>(null);

  const [activeQuestion, setActiveQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const graphPath = useMemo(() => buildPath(functionType, a, b, c), [functionType, a, b, c]);
  const domainQuestions = quickQuestions[domain];
  const currentQuestion = domainQuestions[activeQuestion];
  const isCorrect = selectedAnswer === currentQuestion.answer;
  const codingScenario = codingScenarios[codingScenarioIndex];
  const codingCorrect = codingAnswer === codingScenario.answer;
  const languageScenario = languageScenarios[languageScenarioIndex];
  const languageCorrect = languageAnswer === languageScenario.answer;

  return (
    <SectionContainer className="bg-muted border-y border-border/80" aria-labelledby="interactive-lab-heading">
        <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
          <Badge variant="secondary" className="border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium tracking-widest uppercase text-primary">
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
          className="mb-6"
        >
          <TabsList className="grid w-full grid-cols-1 gap-3 bg-transparent p-0 md:grid-cols-3">
            <TabsTrigger value="math" className="border border-border bg-card data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <SlidersHorizontal className="size-4" />
              Math & Science
            </TabsTrigger>
            <TabsTrigger value="coding" className="border border-border bg-card data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <Code2 className="size-4" />
              Coding Logic
            </TabsTrigger>
            <TabsTrigger value="language" className="border border-border bg-card data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <Languages className="size-4" />
              Language Skills
            </TabsTrigger>
          </TabsList>
          <TabsContent value={domain} className="mt-6" />
        </Tabs>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-body-sm font-semibold text-primary">
                <SlidersHorizontal className="size-4" />
                {domain === "math" ? "Function Explorer" : domain === "coding" ? "Logic Playground" : "Sentence Builder"}
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-body-sm text-muted-foreground">
                <Sparkles className="size-3.5" />
                Live update
              </div>
            </div>

            {domain === "math" ? (
              <>
                <div className="mb-5 grid gap-3 sm:grid-cols-3">
                  {(["quadratic", "sine", "absolute"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFunctionType(type)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-body-sm font-semibold transition-colors",
                        functionType === type
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-muted"
                      )}
                    >
                      {type === "quadratic" ? "Quadratic" : type === "sine" ? "Sine Wave" : "Absolute"}
                    </button>
                  ))}
                </div>

                <div className="mb-6 space-y-3">
                  <label className="block text-body-sm font-medium text-foreground">
                    a ({a.toFixed(1)})
                    <input
                      type="range"
                      min={-4}
                      max={4}
                      step={0.1}
                      value={a}
                      onChange={(e) => setA(Number(e.target.value))}
                      className="mt-1.5 w-full accent-primary"
                    />
                  </label>
                  <label className="block text-body-sm font-medium text-foreground">
                    b ({b.toFixed(1)})
                    <input
                      type="range"
                      min={-3}
                      max={3}
                      step={0.1}
                      value={b}
                      onChange={(e) => setB(Number(e.target.value))}
                      className="mt-1.5 w-full accent-primary"
                    />
                  </label>
                  <label className="block text-body-sm font-medium text-foreground">
                    c ({c.toFixed(1)})
                    <input
                      type="range"
                      min={-4}
                      max={4}
                      step={0.1}
                      value={c}
                      onChange={(e) => setC(Number(e.target.value))}
                      className="mt-1.5 w-full accent-primary"
                    />
                  </label>
                </div>

                <div className="overflow-hidden rounded-xl border border-border bg-background">
                  <svg
                    viewBox={`0 0 ${graphWidth} ${graphHeight}`}
                    className="h-[240px] w-full md:h-[280px]"
                    role="img"
                    aria-label="Function graph preview"
                  >
                    <defs>
                      <pattern id="interactive-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                        <path d="M 28 0 L 0 0 0 28" fill="none" className="stroke-border/70" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect x="0" y="0" width={graphWidth} height={graphHeight} fill="url(#interactive-grid)" />
                    <line x1={0} y1={mapY(0)} x2={graphWidth} y2={mapY(0)} className="stroke-muted-foreground/50" strokeWidth="1.2" />
                    <line x1={mapX(0)} y1={0} x2={mapX(0)} y2={graphHeight} className="stroke-muted-foreground/50" strokeWidth="1.2" />
                    <path d={graphPath} className="fill-none stroke-primary" strokeWidth="3.2" strokeLinecap="round" />
                  </svg>
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
                              ? "border-primary bg-primary text-primary-foreground"
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
                      <p className="mt-3 text-body-sm text-muted-foreground">What is the output?</p>
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
                            ? "Exactly. Kamu baca logic-nya dengan benar."
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
                              ? "border-primary bg-primary text-primary-foreground"
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
                            ? "Great choice. Kalimatnya paling jelas dan natural."
                            : "Coba lagi. Fokus ke grammar yang tepat dan wording yang lebih natural."
                          : "Pilih opsi untuk lihat feedback."}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-secondary/15 px-3 py-1 text-body-sm font-semibold text-brand-secondary">
              <CircleHelp className="size-4" />
              {domain === "math" ? "Math Challenge" : domain === "coding" ? "Coding Challenge" : "Language Challenge"}
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
                      ? "border-primary bg-primary text-primary-foreground"
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
