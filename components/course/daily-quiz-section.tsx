"use client";

import { useState } from "react";
import { Brain, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DailyQuizPopup } from "./daily-quiz-popup";

type DailyQuizSectionProps = {
  courseId: string;
  courseTitle: string;
  dailyTrivia?: {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  } | null;
};

export function DailyQuizSection({ courseId, courseTitle, dailyTrivia }: DailyQuizSectionProps) {
  const [manualTrigger, setManualTrigger] = useState(false);

  return (
    <div className="mb-4 font-sans">
      <div className="relative overflow-hidden rounded-2xl border border-brand-primary/15 bg-linear-to-r from-brand-primary/5 via-brand-primary/10 to-tertiary-1/5 p-5 shadow-xs transition-all duration-300 hover:border-brand-primary/25">
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h3 className="flex items-center gap-2 font-heading text-body-base font-bold text-foreground">
              <Brain className="size-4 text-brand-primary animate-pulse" />
              Trivia Harian
            </h3>
            <p className="mt-1 text-body-sm text-muted-foreground">
              Uji pemahamanmu hari ini dengan satu soal cepat dan pembahasan instan.
            </p>
          </div>
          <div className="shrink-0">
            <Button
              type="button"
              onClick={() => setManualTrigger(true)}
              size="sm"
              className="interactive gap-2 rounded-md bg-brand-primary text-white hover:bg-brand-primary/95 shadow-sm hover:shadow-md"
            >
              <Play className="size-3.5 fill-current" />
              Mulai
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
        dailyTrivia={dailyTrivia}
      />
    </div>
  );
}
