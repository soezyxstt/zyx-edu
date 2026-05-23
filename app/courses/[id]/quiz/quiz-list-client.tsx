"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Lock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExamFixture } from "@/lib/student-course-fixtures";

type QuizListClientProps = {
  courseId: string;
  isEnrolled: boolean;
  quizzes: ExamFixture[];
};

const filterOptions = [
  { value: "all", label: "Semua" },
  { value: "free", label: "Gratis" },
  { value: "premium", label: "Premium" },
] as const;

export function QuizListClient({ courseId, isEnrolled, quizzes }: QuizListClientProps) {
  const [filter, setFilter] = useState<"all" | "free" | "premium">("all");
  const [search, setSearch] = useState("");

  const filteredQuizzes = quizzes.filter((quiz) => {
    const isFree = quiz.isFree || quiz.isPreview || quiz.isPastYear;
    const matchesSearch = quiz.title.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === "free") return isFree;
    if (filter === "premium") return !isFree;
    return true;
  });

  const counts = {
    all: quizzes.length,
    free: quizzes.filter((quiz) => quiz.isFree || quiz.isPreview || quiz.isPastYear).length,
    premium: quizzes.filter((quiz) => !(quiz.isFree || quiz.isPreview || quiz.isPastYear)).length,
  };

  return (
    <div className="space-y-3 font-sans">
      <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-card/70 p-3 backdrop-blur-sm md:flex-row md:items-center md:justify-between">
        <label className="relative md:w-72">
          <span className="sr-only">Cari kuis</span>
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Cari kuis"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-body-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        <div className="flex gap-1 overflow-x-auto">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-body-sm font-semibold transition-colors",
                filter === option.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {option.label} ({counts[option.value]})
            </button>
          ))}
        </div>
      </div>

      <ul className="overflow-hidden rounded-lg border border-border/70 bg-card/75 backdrop-blur-sm">
        {filteredQuizzes.map((quiz) => {
          const isFree = quiz.isFree || quiz.isPreview || quiz.isPastYear;
          const accessible = isEnrolled || isFree;

          return (
            <li key={quiz.id} className="border-b border-border/60 last:border-0">
              <div
                className={cn(
                  "grid gap-3 px-4 py-3 transition-colors md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-center",
                  accessible ? "hover:bg-muted/30" : "bg-card/45 text-muted-foreground",
                )}
              >
                <div className="min-w-0">
                  <h3 className="truncate font-heading text-body-base font-semibold text-foreground">
                    {quiz.title}
                  </h3>
                  <p className="mt-1 text-body-sm text-muted-foreground">
                    {quiz.questions.length} soal
                    {quiz.settings?.timeLimitMinutes ? ` · ${quiz.settings.timeLimitMinutes} menit` : ""}
                    {quiz.settings?.maxAttempts ? ` · ${quiz.settings.maxAttempts}x percobaan` : ""}
                  </p>
                </div>

                <span
                  className={cn(
                    "inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1",
                    isFree
                      ? "bg-status-success/10 text-status-success ring-status-success/20"
                      : "bg-brand-primary/10 text-brand-primary ring-brand-primary/20",
                  )}
                >
                  {!isFree && !isEnrolled && <Lock className="size-3" />}
                  {isFree ? "Gratis" : "Premium"}
                </span>

                <Button
                  asChild
                  variant={accessible ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "interactive rounded-full md:justify-self-end",
                    accessible ? "bg-brand-primary text-white hover:bg-brand-primary/95" : "border-dashed",
                  )}
                >
                  <Link href={`/courses/${courseId}/quiz/${quiz.id}`}>
                    {accessible ? "Mulai" : "Buka"}
                    {accessible ? <ChevronRight className="ml-1 size-4" /> : <Lock className="ml-1 size-3.5" />}
                  </Link>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {filteredQuizzes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/15 py-10 text-center">
          <p className="text-body-sm text-muted-foreground">Tidak ada kuis yang cocok.</p>
        </div>
      ) : null}
    </div>
  );
}
