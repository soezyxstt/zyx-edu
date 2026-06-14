"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers, ListChecks, BookOpen, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StreakTag } from "@/components/dashboard/streak-tag";
import { cn } from "@/lib/utils";

interface PlanItem {
  id: string;
  kind: "flashcards" | "quiz" | "module";
  title: string;
  count?: number;
  href: string;
  done: boolean;
}

interface TodayData {
  streak: { current: number; longest: number };
  items: PlanItem[];
}

const KIND_ICON: Record<PlanItem["kind"], React.ComponentType<{ className?: string }>> = {
  flashcards: Layers,
  quiz: ListChecks,
  module: BookOpen,
};

export function TodayPlan({ firstName }: { firstName: string }) {
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/today")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Feature disabled or unrecoverable error
  if (!loading && !data) return null;

  const doneCount = data?.items.filter((i) => i.done).length ?? 0;
  const total = data?.items.length ?? 0;
  const allDone = total > 0 && doneCount === total;

  const markDone = async (itemId: string) => {
    setData((d) =>
      d ? { ...d, items: d.items.map((i) => (i.id === itemId ? { ...i, done: true } : i)) } : d
    );
    await fetch("/api/student/today/complete", {
      method: "POST",
      body: JSON.stringify({ itemId }),
      headers: { "Content-Type": "application/json" },
    });
  };

  return (
    <div className="mb-8">
      {/* Region 1: Greeting row */}
      <div className="flex items-end justify-between pb-6 border-b border-border">
        <h1 className="font-heading text-h4 text-foreground sm:text-h5">
          Welcome back, {firstName}
        </h1>
        {loading ? (
          <div className="h-7 w-24 bg-muted rounded-md animate-pulse" />
        ) : (
          <StreakTag current={data?.streak.current ?? 0} />
        )}
      </div>

      {/* Region 2: Today's plan */}
      <div className="mt-8">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h2 className="text-h6 font-heading text-foreground">Today</h2>
          {!loading && (
            <span className="text-body-sm text-muted-foreground">
              {doneCount}/{total} done
            </span>
          )}
        </div>

        {loading ? (
          <div className="mt-1 divide-y divide-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="py-3 flex items-center gap-4">
                <div className="size-5 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="size-4 rounded bg-muted animate-pulse shrink-0" />
                <div className="h-4 flex-1 bg-muted rounded-md animate-pulse" />
              </div>
            ))}
          </div>
        ) : total === 0 ? (
          /* Empty: new student */
          <div className="py-3 flex items-center gap-4">
            <span className="text-body-sm text-muted-foreground flex-1">
              Start your first chapter
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link href="/courses">Go to courses</Link>
            </Button>
          </div>
        ) : allDone ? (
          /* All done */
          <div className="py-3">
            <p className="text-body-sm text-muted-foreground">All done for today.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data!.items.map((item, index) => {
              const Icon = KIND_ICON[item.kind];
              return (
                <li
                  key={item.id}
                  className="py-3 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Check circle (perfect 1:1 — rounded-full allowed) */}
                  <button
                    type="button"
                    aria-label={item.done ? "Done" : "Mark as done"}
                    onClick={() => !item.done && markDone(item.id)}
                    className={cn(
                      "size-5 rounded-full border flex items-center justify-center shrink-0 transition-colors duration-150",
                      item.done
                        ? "bg-primary border-primary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {item.done && <Check className="size-3 text-primary-foreground" />}
                  </button>

                  {/* Kind icon */}
                  <Icon className="size-4 text-muted-foreground shrink-0" />

                  {/* Title */}
                  <span
                    className={cn(
                      "text-body-base font-medium flex-1 min-w-0 truncate",
                      item.done && "line-through text-muted-foreground"
                    )}
                  >
                    {item.title}
                  </span>

                  {/* Count badge */}
                  {item.count != null && (
                    <Badge variant="secondary">{item.count}</Badge>
                  )}

                  {/* CTA */}
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={item.href} aria-label={`Go to ${item.title}`}>
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
