"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, CheckCircle2, HelpCircle, Eye, ChevronRight, SlidersHorizontal, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExamFixture } from "@/lib/student-course-fixtures";

type QuizListClientProps = {
  courseId: string;
  isEnrolled: boolean;
  quizzes: ExamFixture[];
};

export function QuizListClient({ courseId, isEnrolled, quizzes }: QuizListClientProps) {
  const [filter, setFilter] = useState<"all" | "free" | "premium">("all");
  const [search, setSearch] = useState("");

  const filteredQuizzes = quizzes.filter((q) => {
    const isFree = q.isFree || q.isPreview || q.isPastYear;
    
    // Search filter
    if (search && !q.title.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }

    // Access filter
    if (filter === "free" && !isFree) return false;
    if (filter === "premium" && isFree) return false;

    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Filters and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card/60 p-4 rounded-2xl border border-border/80 backdrop-blur-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari kuis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2 text-body-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-body-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1 shrink-0">
            <SlidersHorizontal className="size-3.5" />
            Filter Akses:
          </span>
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-full px-4 py-1.5 text-body-xs font-medium transition-colors shrink-0",
              filter === "all"
                ? "bg-brand-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-border hover:text-foreground"
            )}
          >
            Semua ({quizzes.length})
          </button>
          <button
            onClick={() => setFilter("free")}
            className={cn(
              "rounded-full px-4 py-1.5 text-body-xs font-medium transition-colors shrink-0",
              filter === "free"
                ? "bg-status-success text-white"
                : "bg-muted text-muted-foreground hover:bg-border hover:text-foreground"
            )}
          >
            Gratis ({quizzes.filter(q => q.isFree || q.isPreview || q.isPastYear).length})
          </button>
          <button
            onClick={() => setFilter("premium")}
            className={cn(
              "rounded-full px-4 py-1.5 text-body-xs font-medium transition-colors shrink-0",
              filter === "premium"
                ? "bg-brand-secondary text-white"
                : "bg-muted text-muted-foreground hover:bg-border hover:text-foreground"
            )}
          >
            Premium ({quizzes.filter(q => !(q.isFree || q.isPreview || q.isPastYear)).length})
          </button>
        </div>
      </div>

      {/* Tabular Grid Header (Desktop only) */}
      <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 text-body-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <div className="col-span-5">Judul Kuis</div>
        <div className="col-span-2 text-center">Tipe Akses</div>
        <div className="col-span-3">Info Kuis</div>
        <div className="col-span-2 text-right">Tindakan</div>
      </div>

      {/* Quizzes List Rows */}
      <ul className="space-y-3">
        {filteredQuizzes.map((q) => {
          const isFree = q.isFree || q.isPreview || q.isPastYear;
          const accessible = isEnrolled || isFree;

          return (
            <li
              key={q.id}
              className={cn(
                "group rounded-2xl border bg-card p-5 shadow-xs transition-all hover:shadow-md md:p-6",
                accessible
                  ? "border-border/80"
                  : "border-border/50 bg-card/60 opacity-80"
              )}
            >
              <div className="grid gap-4 md:grid-cols-12 md:items-center">
                {/* 1. Quiz Title */}
                <div className="col-span-12 md:col-span-5 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-body-base font-bold text-foreground leading-snug group-hover:text-brand-primary transition-colors">
                      {q.title}
                    </h3>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    ID: {q.id}
                  </p>
                </div>

                {/* 2. Access Type Column */}
                <div className="col-span-12 md:col-span-2 flex items-center md:justify-center">
                  <span className="md:hidden text-body-xs font-semibold text-muted-foreground mr-2">Akses:</span>
                  {isFree ? (
                    <span className="inline-flex items-center rounded-full bg-status-success/10 px-2.5 py-0.5 text-body-xs font-semibold text-status-success ring-1 ring-status-success/20">
                      Gratis (Preview)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-body-xs font-semibold text-brand-primary ring-1 ring-brand-primary/20">
                      {!isEnrolled && <Lock className="size-3" />}
                      Berbayar
                    </span>
                  )}
                </div>

                {/* 3. Quiz Info Column */}
                <div className="col-span-12 md:col-span-3">
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-body-xs text-muted-foreground md:flex-col md:gap-y-1">
                    <span>
                      📄 <b>{q.questions.length}</b> Soal Pilihan Ganda
                    </span>
                    {q.settings?.timeLimitMinutes && (
                      <span>
                        ⏱️ Waktu: <b>{q.settings.timeLimitMinutes}</b> Menit
                      </span>
                    )}
                    {q.settings?.maxAttempts && (
                      <span>
                        🔄 Maksimal: <b>{q.settings.maxAttempts}x</b> Percobaan
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. Action Buttons Column */}
                <div className="col-span-12 md:col-span-2 flex items-center justify-end">
                  {accessible ? (
                    <Button
                      asChild
                      className="interactive w-full rounded-full bg-brand-primary text-white hover:bg-brand-primary/95 md:w-auto px-5"
                    >
                      <Link href={`/courses/${courseId}/quiz/${q.id}`}>
                        Mulai Kuis
                        <ChevronRight className="ml-1 size-4" />
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      variant="outline"
                      className="w-full rounded-full border-dashed text-muted-foreground hover:bg-muted md:w-auto px-5"
                    >
                      <Link href={`/courses/${courseId}/quiz/${q.id}`}>
                        <Lock className="mr-1.5 size-3.5" />
                        Buka Akses
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {filteredQuizzes.length === 0 ? (
        <div className="text-center py-12 rounded-3xl border border-dashed border-border bg-muted/10">
          <p className="text-body-md text-muted-foreground">Tidak ditemukan kuis yang sesuai dengan filter.</p>
        </div>
      ) : null}
    </div>
  );
}
