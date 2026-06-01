"use client";

import { useState } from "react";
import { Brain, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DailyQuizPopup } from "./daily-quiz-popup";

type DailyQuizSectionProps = {
  courseId: string;
  courseTitle: string;
};

export function DailyQuizSection({ courseId, courseTitle }: DailyQuizSectionProps) {
  const [manualTrigger, setManualTrigger] = useState(false);

  return (
    <div className="mb-4 font-sans">
      <div className="relative overflow-hidden rounded-lg border border-brand-primary/20 bg-linear-to-r from-brand-primary/5 via-brand-primary/10 to-tertiary-1/5 p-4">
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h3 className="flex items-center gap-2 font-heading text-body-base font-bold text-foreground">
              <Brain className="size-4 text-brand-primary" />
              Trivia harian
            </h3>
            <p className="mt-1 text-body-sm text-muted-foreground">
              Satu soal cepat dengan pembahasan instan.
            </p>
          </div>
          <div className="shrink-0">
            <Button
              type="button"
              onClick={() => setManualTrigger(true)}
              size="sm"
              className="interactive gap-2 bg-brand-primary text-white hover:bg-brand-primary/95"
            >
              <Play className="size-4 fill-current" />
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
      />
    </div>
  );
}
