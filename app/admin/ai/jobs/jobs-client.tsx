"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Zap, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type JobStatus = "pending" | "processing" | "completed" | "failed";

interface Job {
  id: string;
  courseId: string;
  tutorId: string;
  status: JobStatus;
  promptParameters: unknown;
  targetCount: number;
  generatedCount: number;
  tokenUsage: number;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Course {
  id: string;
  title: string;
}

interface Props {
  jobs: Job[];
  courses: Course[];
  courseMap: Record<string, string>;
}

const statusColors: Record<JobStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  processing: "bg-status-info/10 text-status-info",
  completed: "bg-status-success/10 text-status-success",
  failed: "bg-status-error/10 text-status-error",
};

export function GenerationJobsClient({ jobs, courses, courseMap }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localJobs, setLocalJobs] = useState(jobs);
  const [form, setForm] = useState({
    courseId: "",
    topic: "",
    targetCount: 20,
    difficulty: "mixed" as "easy" | "medium" | "hard" | "mixed",
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.courseId || !form.topic) {
      toast.error("Kursus dan topik wajib diisi.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/generation-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Gagal membuat job: " + JSON.stringify(data.error));
        return;
      }
      toast.success(`Job dibuat: ${data.jobId}. Pipeline berjalan di background.`);
      setShowForm(false);
      // Optimistically add job to list
      setLocalJobs((prev) => [
        {
          id: data.jobId,
          courseId: form.courseId,
          tutorId: "",
          status: "pending" as JobStatus,
          promptParameters: { topic: form.topic, difficulty: form.difficulty },
          targetCount: form.targetCount,
          generatedCount: 0,
          tokenUsage: 0,
          errorMessage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        ...prev,
      ]);
    } finally {
      setSubmitting(false);
    }
  }

  async function refreshJob(jobId: string) {
    const res = await fetch(`/api/admin/generation-jobs/${jobId}`);
    if (!res.ok) return;
    const updated = await res.json();
    setLocalJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-body-sm text-muted-foreground">{localJobs.length} job terbaru</p>
        <Button
          className="rounded-lg gap-2"
          onClick={() => setShowForm((v) => !v)}
          variant={showForm ? "outline" : "default"}
        >
          <Plus className="size-4" />
          {showForm ? "Tutup" : "Buat Job Baru"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm space-y-4"
        >
          <h2 className="font-heading text-h6 font-semibold text-foreground flex items-center gap-2">
            <Zap className="size-5 text-status-warning" />
            Buat Generation Job
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-body-sm font-medium text-foreground mb-1 block">Kursus</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm"
                value={form.courseId}
                onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))}
                required
              >
                <option value="">Pilih kursus...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-body-sm font-medium text-foreground mb-1 block">Difficulty</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm"
                value={form.difficulty}
                onChange={(e) =>
                  setForm((f) => ({ ...f, difficulty: e.target.value as typeof form.difficulty }))
                }
              >
                <option value="mixed">Mixed</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-body-sm font-medium text-foreground mb-1 block">Topik / Query</label>
            <input
              type="text"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm"
              placeholder="Contoh: Limit dan Kekontinuan Fungsi"
              value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="text-body-sm font-medium text-foreground mb-1 block">
              Jumlah Soal Target
            </label>
            <input
              type="number"
              min={1}
              max={100}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm"
              value={form.targetCount}
              onChange={(e) =>
                setForm((f) => ({ ...f, targetCount: Math.max(1, Number(e.target.value)) }))
              }
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="rounded-lg" disabled={submitting}>
              {submitting ? "Mengirim..." : "Jalankan Pipeline"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              onClick={() => setShowForm(false)}
            >
              Batal
            </Button>
          </div>
        </form>
      )}

      {localJobs.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-body-sm">
          Belum ada generation job.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {localJobs.map((job) => {
            const params = job.promptParameters as Record<string, unknown>;
            return (
              <div key={job.id} className="py-4 flex items-start gap-4">
                <Zap className="size-5 text-status-warning mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground text-body-sm">
                      {String(params.topic ?? "—")}
                    </span>
                    <span className="text-muted-foreground text-body-sm">·</span>
                    <span className="text-body-sm text-muted-foreground">
                      {courseMap[job.courseId] ?? job.courseId}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${statusColors[job.status]}`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <p className="text-body-sm text-muted-foreground mt-1">
                    {job.generatedCount}/{job.targetCount} soal ·{" "}
                    {job.tokenUsage.toLocaleString()} tokens ·{" "}
                    {new Date(job.createdAt).toLocaleString("id-ID")}
                  </p>
                  {job.errorMessage && (
                    <p className="text-body-sm text-status-error mt-1 truncate">
                      {job.errorMessage}
                    </p>
                  )}
                </div>
                {(job.status === "pending" || job.status === "processing") && (
                  <button
                    onClick={() => refreshJob(job.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Refresh status"
                  >
                    <RefreshCw className="size-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
