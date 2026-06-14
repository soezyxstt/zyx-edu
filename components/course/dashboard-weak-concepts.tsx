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
}

function barTone(score: number) {
  if (score >= 70) return "bg-status-success";
  if (score >= 40) return "bg-status-warning";
  return "bg-status-error";
}

function TrendIcon({ trend }: { trend?: "improving" | "stable" | "declining" | null }) {
  if (trend === "improving") return <TrendingUp className="size-3.5 text-status-success" />;
  if (trend === "declining") return <TrendingDown className="size-3.5 text-status-error" />;
  if (trend === "stable") return <Minus className="size-3.5 text-muted-foreground" />;
  return null; // P1A: trend slot reserved, filled by P1B
}

export function DashboardWeakConcepts({ concepts }: DashboardWeakConceptsProps) {
  const weak = concepts.filter((c) => c.evidenceCount >= 3 && c.masteryScore < 70).slice(0, 5);

  return (
    <div>
      <h2 className="text-h6 font-heading border-b border-border pb-2 mb-3">Weak concepts</h2>

      {weak.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">
          No weak concepts yet. Take a quiz to start tracking.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {weak.map((c, index) => (
            <div
              key={c.conceptName}
              className="py-3 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Concept name + trend icon */}
              <div className="flex-1 min-w-0">
                <span className="flex items-center gap-1.5 text-body-base font-medium text-foreground truncate">
                  {c.conceptName}
                  <TrendIcon trend={c.trend} />
                </span>
                {c.blockedBy && c.blockedBy.length > 0 && (
                  <Badge variant="outline" className="text-muted-foreground mt-1 gap-1 text-[11px] rounded-md">
                    <Lock className="size-3" />
                    needs {c.blockedBy[0]}
                  </Badge>
                )}
              </div>

              {/* Score + bar */}
              <div className="w-40 flex items-center gap-2 shrink-0">
                <div className="flex-1 h-2 overflow-hidden rounded-md bg-muted">
                  <div
                    className={cn("landing-bar h-full rounded-md", barTone(c.masteryScore))}
                    style={{ width: `${c.masteryScore}%`, animationDelay: `${index * 120}ms` }}
                  />
                </div>
                {/* P1B trend icon slot — filled in P1B */}
                <span className="text-body-sm text-muted-foreground tabular-nums w-6 text-right">
                  {c.masteryScore}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
