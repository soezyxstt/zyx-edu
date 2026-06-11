"use client";

import * as React from "react";
import { useTutor } from "@/components/course/tutor-drawer";
import { Button } from "@/components/ui/button";
import { Sparkles, AlertTriangle, BookOpen, ArrowRight } from "lucide-react";

interface WeakConcept {
  id: string;
  title: string;
  conceptName: string;
  type: string;
  difficulty: string;
}

interface DashboardWeakConceptsProps {
  weakConcepts: WeakConcept[];
}

export function DashboardWeakConcepts({ weakConcepts }: DashboardWeakConceptsProps) {
  const { openExplain, openStudyPlan } = useTutor();

  return (
    <div className="rounded-2xl border border-border/60 bg-card/65 p-5 shadow-xs backdrop-blur-md space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-heading text-body-base font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="size-4 text-brand-primary animate-pulse" />
          Rekomendasi Belajar AI
        </h2>
        <Button
          size="xs"
          variant="outline"
          onClick={() => openStudyPlan()}
          className="rounded-lg text-[11px] font-semibold border-brand-primary/20 text-brand-primary hover:bg-brand-primary/5 shrink-0"
        >
          <Sparkles className="size-3 mr-1" />
          Apa yang Harus Saya Pelajari?
        </Button>
      </div>

      {weakConcepts.length > 0 ? (
        <div className="space-y-3">
          {/* Warning banner */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex gap-2 items-start">
            <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-body-xs text-foreground leading-normal">
              <span className="font-bold text-amber-700">Peringatan Konsep Lemah:</span> Anda memiliki {weakConcepts.length} konsep dengan performa kuis di bawah 60%. Asisten AI merekomendasikan penguatan konsep berikut.
            </div>
          </div>

          <div className="space-y-2">
            {weakConcepts.map((ko) => (
              <div
                key={ko.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/40 bg-muted/10 hover:border-brand-primary/25 hover:bg-muted/20 transition-all text-body-xs"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="font-heading text-body-xs font-bold text-foreground truncate">
                    {ko.title}
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5 uppercase font-semibold">
                    Tipe: {ko.type} · Tingkat: {ko.difficulty}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => openExplain(ko.id, "content")}
                    className="rounded-lg text-[10px] h-7 px-2.5"
                  >
                    <BookOpen className="size-3 mr-1" />
                    Tinjau
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-body-xs text-muted-foreground border border-dashed border-border/60 rounded-xl space-y-1">
          <p className="font-medium text-foreground">Pemahaman konsep Anda sangat baik! ✨</p>
          <p className="text-[11px]">Belum ada konsep lemah yang terdeteksi dari hasil kuis terakhir.</p>
        </div>
      )}
    </div>
  );
}
