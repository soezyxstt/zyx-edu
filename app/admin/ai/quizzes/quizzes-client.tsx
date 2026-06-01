"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Clock, Award, ShieldAlert, BookOpen, Loader2, Calendar, ChevronDown, ListPlus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type TemplateType = {
  id: string;
  courseId: string;
  title: string;
  category: "daily" | "weekly" | "chapter" | "premium";
  visibility: "free" | "paid";
  timeLimitSeconds: number | null;
  maxAttempts: number | null;
  selectionRules: unknown;
  createdAt: Date;
};

interface Course {
  id: string;
  title: string;
}

interface Props {
  initialTemplates: TemplateType[];
  courses: Course[];
  courseMap: Record<string, string>;
}

export function QuizzesCurationClient({ initialTemplates, courses, courseMap }: Props) {
  const [templates, setTemplates] = useState<TemplateType[]>(initialTemplates);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<TemplateType | null>(null);

  // Creation Form State
  const [courseId, setCourseId] = useState(courses[0]?.id || "");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TemplateType["category"]>("weekly");
  const [visibility, setVisibility] = useState<TemplateType["visibility"]>("free");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("");
  
  // Selection Rules State
  const [count, setCount] = useState("10");
  const [tagsStr, setTagsStr] = useState("");
  const [easy, setEasy] = useState("3");
  const [medium, setMedium] = useState("5");
  const [hard, setHard] = useState("2");
  
  const [submitting, setSubmitting] = useState(false);

  const handleDeleteStart = (template: TemplateType) => {
    setDeletingTemplate(template);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTemplate) return;
    try {
      const res = await fetch(`/api/quiz/templates/${deletingTemplate.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Template kuis berhasil dihapus.");
        setTemplates((prev) => prev.filter((t) => t.id !== deletingTemplate.id));
        setDeleteOpen(false);
      } else {
        toast.error("Gagal menghapus template kuis.");
      }
    } catch (e) {
      toast.error("Terjadi kesalahan.");
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Judul kuis wajib diisi.");
    
    const qCount = Number(count);
    const easyCount = Number(easy || 0);
    const mediumCount = Number(medium || 0);
    const hardCount = Number(hard || 0);

    if (isNaN(qCount) || qCount < 1) {
      return toast.error("Jumlah soal harus minimal 1.");
    }

    if (easyCount + mediumCount + hardCount !== qCount) {
      return toast.error(
        `Proporsi kesulitan (${easyCount} Easy + ${mediumCount} Medium + ${hardCount} Hard = ${easyCount + mediumCount + hardCount}) harus sama dengan total jumlah soal (${qCount}).`
      );
    }

    try {
      setSubmitting(true);
      const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
      
      const payload = {
        courseId,
        title,
        category,
        visibility,
        timeLimitSeconds: timeLimitMinutes ? Number(timeLimitMinutes) * 60 : undefined,
        maxAttempts: maxAttempts ? Number(maxAttempts) : undefined,
        selectionRules: {
          tags,
          count: qCount,
          difficulty_proportions: {
            easy: easyCount,
            medium: mediumCount,
            hard: hardCount,
          },
        },
      };

      const res = await fetch("/api/quiz/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal membuat kuis template");
      }

      const data = await res.json();
      toast.success("Template kuis berhasil dibuat!");

      const newTemplate: TemplateType = {
        id: data.templateId,
        courseId,
        title,
        category,
        visibility,
        timeLimitSeconds: timeLimitMinutes ? Number(timeLimitMinutes) * 60 : null,
        maxAttempts: maxAttempts ? Number(maxAttempts) : null,
        selectionRules: payload.selectionRules,
        createdAt: new Date(),
      };

      setTemplates((prev) => [newTemplate, ...prev]);
      setCreateOpen(false);

      // Reset Form
      setTitle("");
      setCategory("weekly");
      setVisibility("free");
      setTimeLimitMinutes("");
      setMaxAttempts("");
      setCount("10");
      setTagsStr("");
      setEasy("3");
      setMedium("5");
      setHard("2");
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat kuis");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <h1 className="font-heading text-h4 font-bold text-foreground">Kelola Template Kuis</h1>
          <p className="text-body-sm text-muted-foreground mt-1">
            Konfigurasi kuis otomatis berdasarkan topik dan tingkat kesulitan.
          </p>
        </div>
        {templates.length > 0 && (
          <Button
            onClick={() => setCreateOpen(true)}
            className="rounded-lg bg-brand-primary !text-white hover:bg-brand-primary/95 flex items-center gap-2 cursor-pointer text-body-sm font-bold shadow-sm px-4 py-2 interactive transition-all"
          >
            <Plus className="size-4" /> Buat Template Kuis
          </Button>
        )}
      </div>

      {/* Grid List */}
      {templates.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/30 backdrop-blur-xs py-16 px-6 text-center shadow-xs flex flex-col items-center justify-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary mb-5 border border-brand-primary/20">
            <ListPlus className="size-6" />
          </div>
          <h3 className="font-heading text-body-lg font-bold text-foreground">Belum Ada Template Kuis</h3>
          <p className="text-body-sm text-muted-foreground max-w-sm mx-auto mt-2 leading-relaxed">
            Mulai susun kuis otomatis dengan membuat konfigurasi kuis baru untuk kelas Anda.
          </p>
          <Button
            onClick={() => setCreateOpen(true)}
            className="mt-6 rounded-lg bg-brand-primary !text-white hover:bg-brand-primary/95 flex items-center gap-2 cursor-pointer text-body-sm font-bold shadow-md px-5 py-2.5 transition-all"
          >
            <Plus className="size-4" /> Buat Template Kuis
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {templates.map((template) => {
            const rules = template.selectionRules as Record<string, any>;
            const qCount = rules?.count ?? 0;
            const props = rules?.difficulty_proportions ?? { easy: 0, medium: 0, hard: 0 };
            const tags = rules?.tags ?? [];

            return (
              <div
                key={template.id}
                className="group relative rounded-xl border border-border bg-card/50 backdrop-blur-md p-5 shadow-xs hover:border-brand-primary/40 hover:-translate-y-1 hover:shadow-md hover:shadow-brand-primary/5 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Accent border top line on card */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-brand-primary/60 to-brand-primary/0 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider bg-brand-primary/8 px-2 py-0.5 rounded-md border border-brand-primary/10">
                      {courseMap[template.courseId] ?? template.courseId}
                    </span>
                    <span className="inline-flex rounded-md bg-muted/80 border border-border/40 px-2 py-0.5 text-body-xs font-semibold text-muted-foreground capitalize">
                      {template.category === "weekly" ? "Mingguan" : template.category === "chapter" ? "Evaluasi Bab" : template.category === "premium" ? "Premium" : "Harian"} · {template.visibility === "free" ? "Gratis" : "Premium"}
                    </span>
                  </div>

                  <h3 className="mt-4 font-heading text-body-md font-bold text-foreground leading-snug group-hover:text-brand-primary transition-colors">
                    {template.title}
                  </h3>

                  <div className="mt-4 space-y-2.5 border-t border-border/40 pt-3.5 text-body-sm text-muted-foreground">
                    <div className="flex items-center gap-2.5">
                      <BookOpen className="size-4 text-brand-primary/85 shrink-0" />
                      <span>
                        <strong>{qCount} Soal</strong> <span className="text-muted-foreground/80">({props.easy} Easy · {props.medium} Medium · {props.hard} Hard)</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Clock className="size-4 text-emerald-500/85 shrink-0" />
                      <span>
                        Limit: {template.timeLimitSeconds ? `${Math.round(template.timeLimitSeconds / 60)} menit` : "Tanpa batas"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Award className="size-4 text-brand-secondary/85 shrink-0" />
                      <span>
                        Batas Percobaan: {template.maxAttempts ? `${template.maxAttempts}x` : "Bebas"}
                      </span>
                    </div>
                  </div>

                  {tags.length > 0 && (
                    <div className="mt-4 flex gap-1.5 flex-wrap">
                      {tags.map((t: string) => (
                        <span key={t} className="rounded-md bg-muted/65 border border-border/20 px-2 py-0.5 text-body-xs text-muted-foreground/90 font-medium">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-4">
                  <span className="text-body-xs text-muted-foreground/80 flex items-center gap-1.5 font-medium">
                    <Calendar className="size-3.5" />
                    Dibuat {new Date(template.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                  </span>

                  <Button
                    variant="destructive"
                    size="icon-sm"
                    className="rounded-lg shrink-0 cursor-pointer shadow-xs hover:bg-rose-600 transition-colors"
                    onClick={() => handleDeleteStart(template)}
                    title="Hapus Template Kuis"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          DIALOGS
         ─────────────────────────────────────────────────────────────────────── */}

      {/* CREATE TEMPLATE DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
          <DialogHeader className="p-6 pb-4 border-b border-border/60 shrink-0">
            <DialogTitle className="font-heading text-lg font-bold text-foreground">Buat Template Kuis Baru</DialogTitle>
            <DialogDescription>
              Buat konfigurasi kuis secara manual dengan filter topik dan proporsi kesulitan soal.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-body-sm text-foreground">
              {/* Row 1: Course Target & Category */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-body-xs font-semibold uppercase tracking-wider text-muted-foreground">Mata Kuliah Target</label>
                  <Select value={courseId} onValueChange={setCourseId}>
                    <SelectTrigger className="h-10 border-border/80 bg-background/50 text-body-sm font-medium">
                      <SelectValue placeholder="Pilih Mata Kuliah" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-body-xs font-semibold uppercase tracking-wider text-muted-foreground">Kategori Kuis</label>
                  <Select value={category} onValueChange={(val) => setCategory(val as any)}>
                    <SelectTrigger className="h-10 border-border/80 bg-background/50 text-body-sm font-medium">
                      <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Kuis Mingguan</SelectItem>
                      <SelectItem value="chapter">Evaluasi Bab</SelectItem>
                      <SelectItem value="premium">Premium Latihan</SelectItem>
                      <SelectItem value="daily">Latihan Harian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Title */}
              <div className="space-y-1.5">
                <label className="text-body-xs font-semibold uppercase tracking-wider text-muted-foreground">Judul Template Kuis</label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Kuis 2 - Turunan Berantai"
                  className="h-10 border-border/80 bg-background/50 text-body-sm font-medium"
                />
              </div>

              {/* Row 3: Limits (Time and Attempts) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-body-xs font-semibold uppercase tracking-wider text-muted-foreground">Batas Waktu (Menit)</label>
                  <Input
                    type="number"
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(e.target.value)}
                    placeholder="Kosongkan untuk tanpa batas"
                    className="h-10 border-border/80 bg-background/50 text-body-sm font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-body-xs font-semibold uppercase tracking-wider text-muted-foreground">Maks. Percobaan Siswa</label>
                  <Input
                    type="number"
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(e.target.value)}
                    placeholder="Kosongkan untuk tanpa batas"
                    className="h-10 border-border/80 bg-background/50 text-body-sm font-medium"
                  />
                </div>
              </div>

              {/* Row 4: Visibility */}
              <div className="space-y-1.5">
                <label className="text-body-xs font-semibold uppercase tracking-wider text-muted-foreground">Visibilitas Kuis</label>
                <Select value={visibility} onValueChange={(val) => setVisibility(val as any)}>
                  <SelectTrigger className="h-10 border-border/80 bg-background/50 text-body-sm font-medium">
                    <SelectValue placeholder="Pilih Visibilitas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Gratis (Bisa diakses tanpa token)</SelectItem>
                    <SelectItem value="paid">Premium (Hanya untuk kelas teraktivasi)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Selection Rules Section */}
              <div className="rounded-xl border border-border bg-muted/5 p-5 space-y-4">
                <h3 className="font-heading text-body-sm font-bold text-foreground border-b border-border/50 pb-2 flex items-center gap-2">
                  <BookOpen className="size-4.5 text-brand-primary" />
                  Aturan Seleksi Bank Soal
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-body-xs font-semibold uppercase tracking-wider text-muted-foreground">Jumlah Total Soal</label>
                    <Input
                      type="number"
                      value={count}
                      onChange={(e) => setCount(e.target.value)}
                      className="h-10 border-border/80 bg-background text-body-sm font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-body-xs font-semibold uppercase tracking-wider text-muted-foreground">Filter Topik/Tags (Pisahkan Koma)</label>
                    <Input
                      type="text"
                      value={tagsStr}
                      onChange={(e) => setTagsStr(e.target.value)}
                      placeholder="turunan, limit (opsional)"
                      className="h-10 border-border/80 bg-background text-body-sm font-medium"
                    />
                  </div>
                </div>

                {/* Difficulty Proportions */}
                <div className="space-y-2.5">
                  <label className="text-body-xs font-semibold uppercase tracking-wider text-muted-foreground">Proporsi Kesulitan</label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-xl border border-emerald-500/20 p-3 text-center transition-colors">
                      <label className="text-body-xs font-bold text-emerald-500 block mb-1.5">Easy</label>
                      <input
                        type="number"
                        value={easy}
                        onChange={(e) => setEasy(e.target.value)}
                        className="w-full h-9 text-center rounded-lg border border-emerald-500/25 bg-background text-body-sm font-bold text-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1 bg-amber-500/5 dark:bg-amber-500/10 rounded-xl border border-amber-500/20 p-3 text-center transition-colors">
                      <label className="text-body-xs font-bold text-amber-600 dark:text-amber-500 block mb-1.5">Medium</label>
                      <input
                        type="number"
                        value={medium}
                        onChange={(e) => setMedium(e.target.value)}
                        className="w-full h-9 text-center rounded-lg border border-amber-500/25 bg-background text-body-sm font-bold text-amber-600 dark:text-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div className="space-y-1 bg-rose-500/5 dark:bg-rose-500/10 rounded-xl border border-rose-500/20 p-3 text-center transition-colors">
                      <label className="text-body-xs font-bold text-rose-500 block mb-1.5">Hard</label>
                      <input
                        type="number"
                        value={hard}
                        onChange={(e) => setHard(e.target.value)}
                        className="w-full h-9 text-center rounded-lg border border-rose-500/25 bg-background text-body-sm font-bold text-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                  </div>
                  <span className="block text-[11px] text-muted-foreground leading-normal mt-1.5">
                    Catatan: Easy ({easy || 0}) + Medium ({medium || 0}) + Hard ({hard || 0}) harus bernilai total ({count || 0}).
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 pt-4 border-t border-border/40 bg-muted/5 flex items-center justify-end gap-2.5 shrink-0">
              <Button type="button" variant="outline" className="rounded-lg cursor-pointer font-bold" onClick={() => setCreateOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting} className="rounded-lg cursor-pointer bg-brand-primary !text-white hover:bg-brand-primary/95 font-bold px-6 shadow-sm">
                {submitting ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
                Buat Template Kuis
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE TEMPLATE DIALOG */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md rounded-xl border border-border p-6 shadow-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-500 font-heading text-lg font-bold">
              <ShieldAlert className="size-5 shrink-0" />
              Hapus Template Kuis
            </DialogTitle>
            <DialogDescription className="text-body-sm text-muted-foreground mt-2">
              Tindakan ini akan menghapus template kuis &ldquo;{deletingTemplate?.title}&rdquo; secara permanen dari database. Siswa tidak akan dapat mengakses kuis ini lagi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-5 flex items-center justify-end gap-2.5">
            <Button variant="outline" className="rounded-lg cursor-pointer font-bold" onClick={() => setDeleteOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" className="rounded-lg cursor-pointer font-bold px-6 shadow-sm" onClick={handleDeleteConfirm}>
              Ya, Hapus Permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
