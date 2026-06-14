"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Radio, Users, AlertTriangle } from "lucide-react";
import { useLiveQuizSocket } from "@/components/live/use-live-quiz-socket";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  title: string;
}

interface SessionData {
  sessionId: string;
  code: string;
  wsUrl: string | null;
  hostToken: string | null;
  questionCount: number;
}

type Phase = "setup" | "session";

export default function LiveHostPage() {
  const { id: courseId } = useParams<{ id: string }>();

  const [phase, setPhase] = useState<Phase>("setup");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [creating, setCreating] = useState(false);
  const [session, setSession] = useState<SessionData | null>(null);
  const [controlling, setControlling] = useState(false);

  const wsUrl = session && session.wsUrl && session.hostToken
    ? `${session.wsUrl}?token=${session.hostToken}`
    : null;

  const { state } = useLiveQuizSocket(phase === "session" ? wsUrl : null);

  // Load quiz templates for this course
  useEffect(() => {
    const ac = new AbortController();
    fetch(`/api/live/sessions?courseId=${courseId}`, { signal: ac.signal })
      .then((r) => r.json())
      .catch(() => null)
      .finally(() => setLoadingTemplates(false));

    // Also load templates list
    fetch(`/api/admin/ai/quizzes?courseId=${courseId}`, { signal: ac.signal })
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        const list: Template[] = Array.isArray(data)
          ? data.map((t: { id: string; title: string }) => ({ id: t.id, title: t.title }))
          : [];
        setTemplates(list);
      })
      .catch(() => null);

    return () => ac.abort();
  }, [courseId]);

  const createSession = useCallback(async () => {
    if (!selectedTemplateId) {
      toast.error("Select a quiz template first.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/live/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, templateId: selectedTemplateId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create session");
      }
      const data: SessionData = await res.json();
      setSession(data);
      setPhase("session");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setCreating(false);
    }
  }, [courseId, selectedTemplateId]);

  const control = useCallback(
    async (action: "start" | "next" | "reveal" | "end") => {
      if (!session) return;
      setControlling(true);
      try {
        const res = await fetch(`/api/live/${session.sessionId}/control`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Control failed");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Control failed");
      } finally {
        setControlling(false);
      }
    },
    [session]
  );

  if (!process.env.NEXT_PUBLIC_REALTIME_URL) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <AlertTriangle className="mx-auto mb-3 size-8 text-status-warning" />
        <p className="text-body-sm text-muted-foreground">
          Live quiz is not configured. Set NEXT_PUBLIC_REALTIME_URL and FEATURE_LIVE=1.
        </p>
      </div>
    );
  }

  // ── Setup phase ─────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-lg space-y-6 px-4 py-12">
        <div className="border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <Radio className="size-4 text-brand-primary" />
            <h1 className="font-heading text-h4 font-semibold text-foreground">
              Live Quiz
            </h1>
          </div>
          <p className="mt-1 text-body-sm text-muted-foreground">
            Select a quiz template to start a live session for this course.
          </p>
        </div>

        {loadingTemplates ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-body-sm">Loading templates...</span>
          </div>
        ) : templates.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            No published quiz templates found for this course.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-body-sm font-medium text-foreground">Quiz template</label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="rounded-md">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={createSession}
              disabled={!selectedTemplateId || creating}
              className="rounded-lg"
            >
              {creating ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Start session
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ── Active session ───────────────────────────────────────────────────────────
  const { sessionState, participantCount, currentQuestion, answerCounts, totalAnswered, totalParticipants, top10 } = state;

  return (
    <div className="relative min-h-[70vh] space-y-8 px-4 py-10">
      {/* Connection dot */}
      <div className="absolute right-4 top-4 flex items-center gap-1.5">
        <span
          className={cn(
            "size-2 rounded-full",
            state.connectionStatus === "connected"
              ? "bg-status-success"
              : "animate-pulse bg-status-warning"
          )}
          aria-hidden
        />
        <span className="text-body-xs text-muted-foreground tabular-nums">
          {participantCount} joined
        </span>
      </div>

      {/* ── Lobby ── */}
      {sessionState === "lobby" && session && (
        <div className="flex flex-col items-center justify-center gap-6 pt-8">
          <p className="text-body-sm font-medium uppercase tracking-widest text-muted-foreground">
            Join code
          </p>
          <span className="font-heading text-h1 font-bold tracking-widest text-foreground">
            {session.code}
          </span>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="size-4" />
            <span className="tabular-nums text-body-base font-medium">{participantCount} participants</span>
          </div>
          <p className="text-body-sm text-muted-foreground">
            {session.questionCount} question{session.questionCount !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* ── Question phase ── */}
      {sessionState === "question" && currentQuestion && (
        <div className="mx-auto max-w-2xl space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-body-sm font-medium text-muted-foreground tabular-nums">
              Q {currentQuestion.questionIndex + 1} / {currentQuestion.total}
            </span>
            <span className="text-body-sm text-muted-foreground tabular-nums">
              {totalAnswered} / {totalParticipants || participantCount} answered
            </span>
          </div>

          <p className="font-heading text-h5 font-semibold text-foreground">
            {currentQuestion.prompt}
          </p>

          {/* Per-option count bars */}
          <div className="space-y-2.5">
            {currentQuestion.options.map((opt, i) => {
              const count = answerCounts[i] ?? 0;
              const total = Math.max(1, totalAnswered || 1);
              const pct = Math.round((count / total) * 100);
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-body-sm text-foreground">
                      <span className="mr-1.5 font-bold">{String.fromCharCode(65 + i)}.</span>
                      {opt}
                    </span>
                    <span className="shrink-0 text-body-xs text-muted-foreground tabular-nums">{count}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-md bg-muted">
                    <div
                      className="h-full rounded-md bg-primary transition-[width] duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Reveal / Leaderboard ── */}
      {(sessionState === "reveal" || sessionState === "ended") && top10.length > 0 && (
        <div className="mx-auto max-w-lg space-y-3">
          <h2 className="font-heading text-h6 font-semibold text-foreground">
            {sessionState === "ended" ? "Final leaderboard" : "Leaderboard"}
          </h2>
          <div className="divide-y divide-border rounded-xl border border-border">
            {top10.map((entry) => (
              <div key={entry.userId} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-6 shrink-0 text-center font-heading text-body-sm font-bold tabular-nums text-muted-foreground">
                  {entry.rank}
                </span>
                <span className="flex-1 text-body-sm font-medium text-foreground">{entry.name}</span>
                <span className="tabular-nums text-body-sm font-bold text-primary">{entry.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Controls ── */}
      {sessionState !== "ended" && (
        <div className="flex gap-2 pt-4">
          {sessionState === "lobby" && (
            <Button disabled={controlling} onClick={() => control("start")} className="rounded-lg">
              {controlling ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Start
            </Button>
          )}
          {sessionState === "reveal" && (
            <Button variant="outline" disabled={controlling} onClick={() => control("next")} className="rounded-lg">
              {controlling ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Next
            </Button>
          )}
          {sessionState === "question" && (
            <Button variant="outline" disabled={controlling} onClick={() => control("reveal")} className="rounded-lg">
              {controlling ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Reveal
            </Button>
          )}
          <Button
            variant="destructive"
            disabled={controlling}
            onClick={() => control("end")}
            className="rounded-lg"
          >
            {controlling ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            End
          </Button>
        </div>
      )}
    </div>
  );
}
