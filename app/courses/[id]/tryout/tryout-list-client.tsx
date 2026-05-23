"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, ChevronRight, AlertCircle, RefreshCw, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExamFixture } from "@/lib/student-course-fixtures";

type TryoutListClientProps = {
  courseId: string;
  isEnrolled: boolean;
  tryouts: ExamFixture[];
};

export function TryoutListClient({ courseId, isEnrolled, tryouts }: TryoutListClientProps) {
  const [attempts, setAttempts] = useState<Record<string, number>>({});

  const loadAttempts = () => {
    const counts: Record<string, number> = {};
    for (const t of tryouts) {
      const count = parseInt(localStorage.getItem(`zyx-tryout-attempts-${t.id}`) || "0", 10);
      counts[t.id] = count;
    }
    setAttempts(counts);
  };

  useEffect(() => {
    loadAttempts();

    const handleReset = () => {
      loadAttempts();
    };

    window.addEventListener("zyx-tryout-attempts-reset", handleReset);
    return () => window.removeEventListener("zyx-tryout-attempts-reset", handleReset);
  }, [tryouts]);

  return (
    <div className="space-y-4 font-sans">
      <ul className="space-y-4">
        {tryouts.map((t) => {
          const attemptCount = attempts[t.id] || 0;
          const maxAttempts = t.settings?.maxAttempts ?? 2;
          const isBlocked = attemptCount >= maxAttempts;
          const isFree = t.isFree || t.isPreview;
          const accessible = isEnrolled || isFree;

          return (
            <li
              key={t.id}
              className={cn(
                "group rounded-2xl border bg-card p-5 shadow-xs transition-all hover:shadow-md md:p-6",
                accessible && !isBlocked
                  ? "border-border/80"
                  : "border-border/50 bg-card/60 opacity-80"
              )}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                
                {/* Tryout details */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading text-body-base font-bold text-foreground group-hover:text-brand-primary transition-colors">
                      {t.title}
                    </h3>
                    
                    {/* Badges */}
                    {!accessible && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-body-xs font-semibold text-muted-foreground ring-1 ring-border">
                        <Lock className="size-3" />
                        Premium
                      </span>
                    )}
                    {isFree && (
                      <span className="inline-flex rounded-full bg-status-success/10 px-2 py-0.5 text-body-xs font-semibold text-status-success">
                        Gratis
                      </span>
                    )}
                    {isBlocked && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-status-error/12 px-2.5 py-0.5 text-[10px] font-bold text-status-error uppercase tracking-wider ring-1 ring-status-error/20">
                        Batas Habis
                      </span>
                    )}
                  </div>

                  <p className="text-body-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>⏱️ Waktu: <b>{t.settings?.timeLimitMinutes ?? 90} menit</b></span>
                    <span>•</span>
                    <span>❓ <b>{t.questions.length} soal</b> (Pilgan, Singkat, Multi-pilihan, Esai R2)</span>
                  </p>

                  <div className="flex items-center gap-4 text-body-xs pt-1.5">
                    {/* Attempts Status Bar */}
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Percobaan Ujian:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-foreground">{attemptCount}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-muted-foreground">{maxAttempts}</span>
                      </div>
                      
                      {/* Visual dots tracker */}
                      <div className="flex gap-1 shrink-0">
                        {Array.from({ length: maxAttempts }).map((_, i) => (
                          <span
                            key={i}
                            className={cn(
                              "size-2 rounded-full border border-border/80 transition-colors",
                              i < attemptCount
                                ? "bg-brand-secondary border-transparent"
                                : "bg-muted"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex shrink-0 items-center justify-end">
                  {!accessible ? (
                    <Button
                      asChild
                      variant="outline"
                      className="w-full rounded-full border-dashed text-muted-foreground hover:bg-muted md:w-auto px-6"
                    >
                      <Link href={`/courses/${courseId}/tryout/${t.id}`}>
                        <Lock className="mr-1.5 size-4" />
                        Buka dengan Token
                      </Link>
                    </Button>
                  ) : isBlocked ? (
                    <Button
                      disabled
                      variant="ghost"
                      className="w-full rounded-full bg-muted text-muted-foreground md:w-auto border border-border/80 px-6 cursor-not-allowed"
                    >
                      <Lock className="mr-1.5 size-4" />
                      Batas Percobaan Habis
                    </Button>
                  ) : (
                    <Button
                      asChild
                      className="interactive w-full rounded-full bg-brand-primary text-white hover:bg-brand-primary/95 md:w-auto px-6"
                    >
                      <Link href={`/courses/${courseId}/tryout/${t.id}`}>
                        Mulai Tryout
                        <ChevronRight className="ml-1 size-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Campus Exam Period Warning Banner */}
      <div className="rounded-2xl border border-brand-secondary/20 bg-brand-secondary/5 p-4 flex items-start gap-3">
        <Calendar className="size-5 text-brand-secondary shrink-0 mt-0.5" />
        <div className="space-y-1 text-body-xs">
          <h4 className="font-bold text-foreground">Kebijakan Batas Percobaan (Maks. 2x)</h4>
          <p className="text-muted-foreground leading-relaxed">
            Tryout ujian disimulasikan sesuai sistem ujian kampus ITB yang sesungguhnya. Siswa hanya diberikan maksimal <b>2 kali kesempatan pengumpulan</b> dengan interval jeda belajar di antaranya untuk memastikan efektivitas pemahaman.
          </p>
        </div>
      </div>
    </div>
  );
}
