"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, BookText, ChevronDown, ChevronUp, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Instance {
  id: string;
  title: string;
  courseId: string;
  sourceType: string;
  summary: string;
  keywords: unknown;
  pineconeSyncStatus: string;
  lastSyncError: string | null;
  createdAt: Date;
}

interface Course {
  id: string;
  title: string;
}

interface Props {
  instances: Instance[];
  courses: Course[];
  courseMap: Record<string, string>;
}

export function MaterialInstancesClient({ instances, courses, courseMap }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    courseId: "",
    title: "",
    sourceType: "markdown" as "markdown" | "json" | "pdf_extraction",
    rawText: "",
    summary: "",
    learningObjectives: "",
    keywords: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.courseId || !form.title || !form.rawText || !form.summary) {
      toast.error("Semua field wajib diisi.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/material-instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: form.courseId,
          title: form.title,
          sourceType: form.sourceType,
          rawText: form.rawText,
          summary: form.summary,
          learningObjectives: form.learningObjectives
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          keywords: form.keywords
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Gagal menyimpan materi: " + JSON.stringify(data.error));
        return;
      }
      toast.success(
        `Materi disimpan. ${data.sectionsCreated} seksi, ${data.chunksCreated} chunk. Pinecone sedang di-sync.`,
      );
      setShowForm(false);
      setForm({
        courseId: "",
        title: "",
        sourceType: "markdown",
        rawText: "",
        summary: "",
        learningObjectives: "",
        keywords: "",
      });
      // Reload to show new instance
      window.location.reload();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-body-sm text-muted-foreground">{instances.length} materi terdaftar</p>
        <Button
          className="rounded-lg gap-2"
          onClick={() => setShowForm((v) => !v)}
          variant={showForm ? "outline" : "default"}
        >
          {showForm ? <ChevronUp className="size-4" /> : <Plus className="size-4" />}
          {showForm ? "Tutup" : "Tambah Materi"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm space-y-4"
        >
          <h2 className="font-heading text-h6 font-semibold text-foreground">Tambah Materi Baru</h2>

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
              <label className="text-body-sm font-medium text-foreground mb-1 block">Tipe Sumber</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm"
                value={form.sourceType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sourceType: e.target.value as typeof form.sourceType }))
                }
              >
                <option value="markdown">Markdown</option>
                <option value="json">JSON</option>
                <option value="pdf_extraction">PDF Extraction</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-body-sm font-medium text-foreground mb-1 block">Judul Materi</label>
            <input
              type="text"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm"
              placeholder="Contoh: Limit dan Kekontinuan — Bab 3"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="text-body-sm font-medium text-foreground mb-1 block">Ringkasan (Summary)</label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm min-h-[80px]"
              placeholder="Gambaran singkat isi materi untuk AI..."
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="text-body-sm font-medium text-foreground mb-1 block">
              Teks Materi Lengkap
            </label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm min-h-[200px] font-mono text-sm"
              placeholder="Tempel teks materi di sini. Gunakan ## atau ### untuk memisahkan seksi..."
              value={form.rawText}
              onChange={(e) => setForm((f) => ({ ...f, rawText: e.target.value }))}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-body-sm font-medium text-foreground mb-1 block">
                Tujuan Pembelajaran (satu per baris)
              </label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm min-h-[80px]"
                placeholder="Siswa dapat menghitung limit&#10;Siswa memahami teorema jepit"
                value={form.learningObjectives}
                onChange={(e) => setForm((f) => ({ ...f, learningObjectives: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-body-sm font-medium text-foreground mb-1 block">
                Keywords (pisahkan dengan koma)
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm"
                placeholder="limit, kekontinuan, turunan"
                value={form.keywords}
                onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="rounded-lg" disabled={submitting}>
              {submitting ? "Memproses..." : "Simpan & Ingest ke Pinecone"}
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

      {instances.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-body-sm">
          Belum ada materi AI. Klik &quot;Tambah Materi&quot; untuk mulai.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {instances.map((inst) => (
            <InstanceRow key={inst.id} instance={inst} courseMap={courseMap} />
          ))}
        </div>
      )}
    </div>
  );
}

function InstanceRow({
  instance,
  courseMap,
}: {
  instance: Instance;
  courseMap: Record<string, string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const keywords = Array.isArray(instance.keywords) ? (instance.keywords as string[]) : [];

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/material-instances?id=${instance.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Materi berhasil dihapus.");
        setIsDeleteDialogOpen(false);
        window.location.reload();
      } else {
        const err = await res.json();
        toast.error("Gagal menghapus materi: " + (err.error ?? "Unknown error"));
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleRetry() {
    setIsRetrying(true);
    try {
      const res = await fetch(`/api/admin/material-instances/${instance.id}/retry`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message ?? "Proses sinkronisasi ulang dimulai.");
        window.location.reload();
      } else {
        const err = await res.json();
        toast.error("Gagal sinkronisasi ulang: " + (err.error ?? "Unknown error"));
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <div className="py-4">
      <div className="flex items-start gap-4">
        <BookText className="size-5 text-tertiary-1 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground text-body-sm">{instance.title}</span>
            <span className="text-body-sm text-muted-foreground">·</span>
            <span className="text-body-sm text-muted-foreground">
              {courseMap[instance.courseId] ?? instance.courseId}
            </span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-body-sm text-muted-foreground text-xs font-mono">
              {instance.sourceType}
            </span>

            {/* Pinecone Sync Badge */}
            {instance.pineconeSyncStatus === "synced" && (
              <span className="rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 text-xs font-medium">
                Tersinkronisasi
              </span>
            )}
            {instance.pineconeSyncStatus === "pending" && (
              <span className="rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 text-xs font-medium flex items-center gap-1 animate-pulse">
                Menyinkronkan...
              </span>
            )}
            {instance.pineconeSyncStatus === "failed" && (
              <span
                className="rounded-md bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 text-xs font-medium cursor-help"
                title={instance.lastSyncError ?? "Gagal menyinkronkan ke Pinecone"}
              >
                Gagal Sinkronisasi
              </span>
            )}
          </div>
          <p className="text-body-sm text-muted-foreground mt-1 line-clamp-2">{instance.summary}</p>
          {keywords.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-2">
              {keywords.map((k) => (
                <span
                  key={k}
                  className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Toggle details"
        >
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>
      {expanded && (
        <div className="mt-4 ml-9 text-body-sm text-muted-foreground space-y-2 border-t border-border pt-3">
          <p>
            <span className="font-medium text-foreground">ID:</span> {instance.id}
          </p>
          <p>
            <span className="font-medium text-foreground">Dibuat:</span>{" "}
            {new Date(instance.createdAt).toLocaleString("id-ID")}
          </p>
          {instance.lastSyncError && (
            <p className="text-destructive font-mono text-xs bg-destructive/5 p-2 rounded-md border border-destructive/10">
              <span className="font-semibold block mb-0.5">Error Log:</span> {instance.lastSyncError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            {instance.pineconeSyncStatus === "failed" && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-md gap-2"
                onClick={handleRetry}
                disabled={isRetrying}
              >
                <RefreshCw className={`size-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                {isRetrying ? "Sinkron Ulang..." : "Sinkron Ulang"}
              </Button>
            )}

            <Button
              size="sm"
              variant="destructive"
              className="rounded-md gap-2"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isDeleting}
            >
              <Trash2 className="size-3.5" />
              Hapus Materi
            </Button>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Hapus */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Hapus Materi AI?</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus materi &quot;{instance.title}&quot;? Tindakan ini akan menghapus materi secara permanen dari PostgreSQL dan membersihkan seluruh indeks vektor terkait di Pinecone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="rounded-lg"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              className="rounded-lg"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Menghapus..." : "Hapus Permanen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
