"use client";

import * as React from "react";
import { TrendingUp, TrendingDown, Minus, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MasteryConcept {
  conceptName: string;
  masteryScore: number;
  evidenceCount: number;
  trend?: "improving" | "stable" | "declining" | null;
  blockedBy?: string[];
}

interface DashboardWeakConceptsProps {
  concepts: MasteryConcept[];
  courseTitle?: string;
}

function barTone(score: number) {
  if (score >= 70) return "bg-status-success";
  if (score >= 40) return "bg-status-warning";
  return "bg-status-error";
}

function TrendIcon({ trend }: { trend?: "improving" | "stable" | "declining" | null }) {
  if (trend === "improving") return <TrendingUp className="size-3.5 text-status-success" />;
  if (trend === "declining") return <TrendingDown className="size-3.5 text-status-error" />;
  return <Minus className="size-3.5 text-muted-foreground" />;
}

export function DashboardWeakConcepts({ concepts, courseTitle = "Kuliah" }: DashboardWeakConceptsProps) {
  // Show top 4 concepts sorted by learning order (or simply the slice of first 4 concepts)
  const displayConcepts = concepts.slice(0, 4);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/65 p-5 shadow-sm backdrop-blur-md text-left">
      {/* Mock Browser Header */}
      <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3 font-mono text-[10px] font-semibold text-muted-foreground select-none">
        <div className="flex items-center gap-1.5">
          <span className="flex gap-1.5">
            <span className="size-2 rounded-full bg-border" />
            <span className="size-2 rounded-full bg-border" />
            <span className="size-2 rounded-full bg-border" />
          </span>
          <span className="ml-1.5 uppercase tracking-wider">Peta Penguasaan · {courseTitle}</span>
        </div>
      </div>

      {displayConcepts.length === 0 ? (
        <p className="text-body-sm text-muted-foreground py-4">
          Belum ada data penguasaan. Kerjakan kuis untuk mulai melacak progress Anda.
        </p>
      ) : (
        <div className="space-y-4">
          {displayConcepts.map((c, index) => (
            <div
              key={c.conceptName}
              className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Concept name + trend icon + score */}
              <div className="flex items-center justify-between text-body-sm">
                <span className="flex items-center gap-1.5 font-medium text-foreground truncate max-w-[80%]">
                  {c.conceptName}
                  <TrendIcon trend={c.trend} />
                </span>
                <span className="font-mono text-xs font-semibold text-muted-foreground">
                  {c.masteryScore}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 overflow-hidden rounded-md bg-muted w-full">
                <div
                  className={cn("h-full rounded-md transition-all duration-500 ease-out", barTone(c.masteryScore))}
                  style={{ width: `${c.masteryScore}%` }}
                />
              </div>

              {c.blockedBy && c.blockedBy.length > 0 && (
                <div className="mt-0.5">
                  <Badge variant="outline" className="text-muted-foreground gap-1 text-[10px] rounded-md py-0.5">
                    <Lock className="size-3" />
                    butuh {c.blockedBy[0]}
                  </Badge>
                </div>
              )}
            </div>
          ))}
          
          <p className="mt-4 pt-2 border-t border-border/30 text-[10px] text-muted-foreground select-none">
            Diperbarui otomatis dari kuis dan sesi flashcard terakhir.
          </p>
        </div>
      )}
    </div>
  );
}
