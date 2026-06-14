"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { LineChart, Line } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/reveal";
import { DistributionBar } from "@/components/tutor/distribution-bar";
import { WatchlistTable } from "@/components/tutor/watchlist-table";
import { ConceptDrilldown } from "@/components/tutor/concept-drilldown";
import type { SnapshotPayload, WeakConcept } from "@/lib/cohort-analytics";

function relativeTime(date: Date | null): string {
  if (!date) return "";
  const diffMs = Date.now() - date.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return "just now";
  if (diffH === 1) return "1 h ago";
  return `${diffH} h ago`;
}

interface Props {
  courseId: string;
  analytics: SnapshotPayload;
  updatedAt: string | null; // ISO string from server
}

export function AnalyticsClient({ courseId, analytics, updatedAt }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [drillConcept, setDrillConcept] = useState<WeakConcept | null>(null);

  const updatedDate = updatedAt ? new Date(updatedAt) : null;

  async function handleRefresh() {
    await fetch(`/api/tutor/analytics/refresh?courseId=${encodeURIComponent(courseId)}`, {
      method: "POST",
    });
    startTransition(() => { router.refresh(); });
  }

  function openDrill(concept: WeakConcept) {
    setDrillConcept(concept);
  }

  const drillTrends = drillConcept
    ? (analytics.conceptTrends[drillConcept.conceptName] ?? [])
    : [];
  const drillMissed = drillConcept
    ? (analytics.mostMissed[drillConcept.conceptName] ?? [])
    : [];

  return (
    <>
      {/* Header meta row */}
      <div className="flex items-center gap-3 -mt-6">
        <span className="text-body-sm text-muted-foreground">
          {updatedDate ? `Updated ${relativeTime(updatedDate)}` : "Not yet computed"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isPending}
          className="gap-1.5 h-7 px-2"
        >
          <RefreshCw className={`size-3.5 ${isPending ? "animate-spin" : ""}`} aria-hidden />
          Refresh
        </Button>
      </div>

      {/* Section 2: Weakest concepts with sparklines */}
      <Reveal>
        <section aria-labelledby="weak-heading">
          <h2 id="weak-heading" className="text-body-base font-semibold mb-3">
            Most problematic concepts
          </h2>
          {analytics.weakConcepts.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">
              Analytics appear once students take quizzes.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {analytics.weakConcepts.map((concept, index) => {
                const trendData = analytics.conceptTrends[concept.conceptName] ?? [];
                return (
                  <button
                    key={concept.conceptName}
                    onClick={() => openDrill(concept)}
                    className="w-full py-3 grid grid-cols-[2rem_1fr_auto_5rem_8rem] items-center gap-4 text-left animate-in fade-in slide-in-from-bottom-2 duration-300 hover:bg-muted/40 rounded-md -mx-1 px-1 transition-colors"
                    style={{ animationDelay: `${Math.min(index, 7) * 50}ms` }}
                  >
                    <span className="text-h6 font-heading text-muted-foreground tabular-nums">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-body-base font-medium truncate">{concept.conceptName}</p>
                      <p className="text-body-sm text-muted-foreground">{concept.studentCount} students</p>
                    </div>
                    <span className="tabular-nums text-body-base">{concept.avgMastery}</span>
                    {/* Sparkline */}
                    <div className="w-20 h-6 shrink-0">
                      {trendData.length >= 2 ? (
                        <LineChart width={80} height={24} data={trendData}>
                          <Line
                            type="monotone"
                            dataKey="avgMastery"
                            stroke="var(--color-primary)"
                            strokeWidth={1.5}
                            dot={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      ) : (
                        <span className="text-muted-foreground/40 text-body-sm">--</span>
                      )}
                    </div>
                    <DistributionBar
                      low={concept.bucketLow}
                      mid={concept.bucketMid}
                      high={concept.bucketHigh}
                      total={concept.studentCount}
                      className="w-32"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </Reveal>

      {/* Section 3: Full mastery distribution */}
      <Reveal>
        <section aria-labelledby="dist-heading">
          <h2 id="dist-heading" className="text-body-base font-semibold mb-3">
            Mastery distribution
          </h2>
          {analytics.allConcepts.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">
              Analytics appear once students take quizzes.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {analytics.allConcepts.map((concept, index) => (
                <div
                  key={concept.conceptName}
                  className="py-3 grid grid-cols-[2rem_1fr_auto_8rem] items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
                  style={{ animationDelay: `${Math.min(index, 7) * 50}ms` }}
                >
                  <span className="text-h6 font-heading text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-body-base font-medium truncate">{concept.conceptName}</p>
                    <p className="text-body-sm text-muted-foreground">{concept.studentCount} students</p>
                  </div>
                  <span className="tabular-nums text-body-base">{concept.avgMastery}</span>
                  <DistributionBar
                    low={concept.bucketLow}
                    mid={concept.bucketMid}
                    high={concept.bucketHigh}
                    total={concept.studentCount}
                    className="w-48"
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </Reveal>

      {/* Section 4: Active interventions */}
      <Reveal>
        <section aria-labelledby="interventions-heading">
          <h2 id="interventions-heading" className="text-body-base font-semibold mb-3">
            Active interventions
          </h2>
          {analytics.interventionCounts.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">
              Available after the feedback phase ships.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {analytics.interventionCounts.map((item) => (
                <div key={item.conceptName} className="py-2.5 flex items-center justify-between">
                  <span className="text-body-base">{item.conceptName}</span>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))}
            </div>
          )}
        </section>
      </Reveal>

      {/* Section 5: Watchlist */}
      <Reveal>
        <section aria-labelledby="watchlist-heading">
          <h2 id="watchlist-heading" className="text-body-base font-semibold mb-3">
            Students needing attention
          </h2>
          <WatchlistTable students={analytics.watchlist} />
        </section>
      </Reveal>

      {/* Drill-down sheet */}
      <ConceptDrilldown
        open={drillConcept !== null}
        onClose={() => setDrillConcept(null)}
        concept={drillConcept}
        trends={drillTrends}
        mostMissed={drillMissed}
        courseId={courseId}
      />
    </>
  );
}
