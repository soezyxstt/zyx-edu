"use client";

import { useState } from "react";
import { Brain, Sparkles, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DailyQuizPopup } from "./daily-quiz-popup";

type DailyQuizSectionProps = {
  courseId: string;
  courseTitle: string;
};

export function DailyQuizSection({ courseId, courseTitle }: DailyQuizSectionProps) {
  const [manualTrigger, setManualTrigger] = useState(false);

  return (
    <div className="mb-8 font-sans">
      <div className="relative overflow-hidden rounded-3xl border border-brand-primary/20 bg-linear-to-r from-brand-primary/5 via-brand-primary/10 to-tertiary-1/5 p-6 shadow-sm">
        {/* Ambient glow decoration */}
        <div className="absolute -right-16 -top-16 size-36 rounded-full bg-brand-primary/10 blur-2xl" />
        <div className="absolute -left-16 -bottom-16 size-36 rounded-full bg-tertiary-1/10 blur-2xl" />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5 max-w-2xl">
            <h3 className="font-heading text-body-base font-bold text-foreground flex items-center gap-2">
              <Brain className="size-5 text-brand-primary animate-pulse" />
              Tantangan Trivia Harian
            </h3>
            <p className="text-body-sm text-muted-foreground leading-relaxed">
              Asah otakmu setiap hari dengan 1 soal cepat trivia materi kuliah terkait.
              Dapatkan penjelasan ringkas instan yang dibahas langsung oleh AI!
            </p>
          </div>
          <div className="shrink-0">
            <Button
              type="button"
              onClick={() => setManualTrigger(true)}
              className="interactive gap-2 rounded-full bg-brand-primary text-white hover:bg-brand-primary/95 motion-safe:hover:scale-[1.03]"
            >
              <Play className="size-4 fill-current" />
              Mulai Kuis Harian
            </Button>
          </div>
        </div>
      </div>

      {/* Auto-mounting and manual pop-up controller */}
      <DailyQuizPopup
        courseId={courseId}
        courseTitle={courseTitle}
        triggerManual={manualTrigger}
        onCloseManual={() => setManualTrigger(false)}
      />
    </div>
  );
}
