"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CheckSquare, Square, ChevronDown, ChevronUp, Filter, Plus, Edit2, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/course/markdown-renderer";

type ReviewStatus = "generated" | "reviewed" | "published" | "flagged" | "retired";
type Difficulty = "easy" | "medium" | "hard";

interface Question {
  id: string;
  courseId: string;
  difficulty: Difficulty;
  questionType: string;
  tags: unknown;
  prompt: string;
  options: unknown;
  correctIndices: unknown;
  explanation: string;
  reviewStatus: ReviewStatus;
  qualityScore: number;
  useCount: number;
  createdAt: Date;
}

interface Course {
  id: string;
  title: string;
}

interface Props {
  questions: Question[];
  courses: Course[];
  courseMap: Record<string, string>;
}

const statusColors: Record<ReviewStatus, string> = {
  generated: "bg-muted text-muted-foreground",
  reviewed: "bg-status-info/10 text-status-info",
  published: "bg-status-success/10 text-status-success",
  flagged: "bg-status-warning/10 text-status-warning",
  retired: "bg-muted/50 text-muted-foreground line-through",
};

const difficultyColors: Record<Difficulty, string> = {
  easy: "text-emerald-500 font-semibold",
  medium: "text-amber-500 font-semibold",
  hard: "text-rose-500 font-semibold",
};

export function QuestionBankClient({ questions, courses, courseMap }: Props) {
  const [filterStatus, setFilterStatus] = useState<ReviewStatus | "all">("all");
  const [filterCourse, setFilterCourse] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState(false);
  const [localQuestions, setLocalQuestions] = useState(questions);

  // Dialog & Form state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);

  // Create Form State
  const [createCourseId, setCreateCourseId] = useState(courses[0]?.id || "");
  const [createPrompt, setCreatePrompt] = useState("");
  const [createOptions, setCreateOptions] = useState<string[]>(["", "", "", "", ""]);
  const [createCorrectIndex, setCreateCorrectIndex] = useState<number>(0);
  const [createExplanation, setCreateExplanation] = useState("");
  const [createDifficulty, setCreateDifficulty] = useState<Difficulty>("medium");
  const [createTagsStr, setCreateTagsStr] = useState("");
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Edit Form State
  const [editPrompt, setEditPrompt] = useState("");
  const [editOptions, setEditOptions] = useState<string[]>(["", "", "", "", ""]);
  const [editCorrectIndex, setEditCorrectIndex] = useState<number>(0);
  const [editExplanation, setEditExplanation] = useState("");
  const [editDifficulty, setEditDifficulty] = useState<Difficulty>("medium");
  const [editTagsStr, setEditTagsStr] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const filtered = useMemo(() => {
    return localQuestions.filter((q) => {
      if (filterStatus !== "all" && q.reviewStatus !== filterStatus) return false;
      if (filterCourse !== "all" && q.courseId !== filterCourse) return false;
      return true;
    });
  }, [localQuestions, filterStatus, filterCourse]);

  const uniqueCourses = useMemo(() => {
    const ids = [...new Set(localQuestions.map((q) => q.courseId))];
    return ids.map((id) => ({ id, title: courseMap[id] ?? id }));
  }, [localQuestions, courseMap]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((q) => q.id)));
    }
  }

  async function bulkUpdate(status: ReviewStatus) {
    if (selected.size === 0) {
      toast.error("Pilih minimal satu soal.");
      return;
    }
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], reviewStatus: status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Gagal update: " + JSON.stringify(data.error));
        return;
      }
      toast.success(`${data.updated} soal diupdate ke "${status}".`);
      setLocalQuestions((prev) =>
        prev.map((q) => (selected.has(q.id) ? { ...q, reviewStatus: status } : q)),
      );
      setSelected(new Set());
    } finally {
      setUpdating(false);
    }
  }

  const handleStartEdit = (q: Question) => {
    setEditingQuestion(q);
    setEditPrompt(q.prompt);
    const opts = Array.isArray(q.options) ? [...q.options] : ["", "", "", "", ""];
    while (opts.length < 5) opts.push("");
    setEditOptions(opts.slice(0, 5));
    const correctIdxs = Array.isArray(q.correctIndices) ? q.correctIndices : [];
    setEditCorrectIndex(correctIdxs[0] ?? 0);
    setEditExplanation(q.explanation || "");
    setEditDifficulty(q.difficulty);
    const tagsArr = Array.isArray(q.tags) ? q.tags : [];
    setEditTagsStr(tagsArr.join(", "));
    setEditOpen(true);
  };

  const handleStartDelete = (q: Question) => {
    setDeletingQuestion(q);
    setDeleteOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createPrompt.trim()) return toast.error("Prompt soal wajib diisi.");
    if (createOptions.some(opt => !opt.trim())) return toast.error("Semua 5 pilihan opsi harus diisi.");

    try {
      setSubmittingCreate(true);
      const tags = createTagsStr.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: createCourseId,
          prompt: createPrompt,
          options: createOptions,
          correctIndices: [createCorrectIndex],
          explanation: createExplanation,
          difficulty: createDifficulty,
          tags,
          reviewStatus: "published",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal membuat soal");
      }

      const newQ = await res.json();
      toast.success("Soal manual berhasil ditambahkan!");
      
      const createdQuestion: Question = {
        id: newQ.id,
        courseId: createCourseId,
        difficulty: createDifficulty,
        questionType: "multiple_choice",
        tags,
        prompt: createPrompt,
        options: createOptions,
        correctIndices: [createCorrectIndex],
        explanation: createExplanation,
        reviewStatus: "published",
        qualityScore: 1.0,
        useCount: 0,
        createdAt: new Date(),
      };
      
      setLocalQuestions(prev => [createdQuestion, ...prev]);
      setCreateOpen(false);
      
      setCreatePrompt("");
      setCreateOptions(["", "", "", "", ""]);
      setCreateCorrectIndex(0);
      setCreateExplanation("");
      setCreateTagsStr("");
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat soal");
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    if (!editPrompt.trim()) return toast.error("Prompt soal wajib diisi.");
    if (editOptions.some(opt => !opt.trim())) return toast.error("Semua 5 pilihan opsi harus diisi.");

    try {
      setSubmittingEdit(true);
      const tags = editTagsStr.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await fetch(`/api/admin/questions/${editingQuestion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: editPrompt,
          options: editOptions,
          correctIndices: [editCorrectIndex],
          explanation: editExplanation,
          difficulty: editDifficulty,
          tags,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menyimpan perubahan");
      }

      toast.success("Soal berhasil diperbarui!");
      
      setLocalQuestions(prev =>
        prev.map(item =>
          item.id === editingQuestion.id
            ? {
                ...item,
                prompt: editPrompt,
                options: editOptions,
                correctIndices: [editCorrectIndex],
                explanation: editExplanation,
                difficulty: editDifficulty,
                tags,
              }
            : item
        )
      );
      setEditOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan perubahan");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingQuestion) return;
    try {
      const res = await fetch(`/api/admin/questions/${deletingQuestion.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Soal berhasil dihapus.");
        setLocalQuestions((prev) => prev.filter((item) => item.id !== deletingQuestion.id));
        setDeleteOpen(false);
      } else {
        toast.error("Gagal menghapus soal.");
      }
    } catch (e) {
      toast.error("Terjadi kesalahan.");
    }
  };

  return (
    <div className="font-sans space-y-6">
      
      {/* Filters and Action */}
      <div className="flex items-center gap-4 flex-wrap pb-4 border-b border-border/80 justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-muted-foreground mr-1.5">
            <Filter className="size-4 shrink-0" />
            <span className="text-body-sm font-semibold">Filter:</span>
          </div>
          
          <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val as any)}>
            <SelectTrigger className="h-9 border-border/80 bg-background/50 text-body-sm font-medium min-w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="generated">Generated</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCourse} onValueChange={setFilterCourse}>
            <SelectTrigger className="h-9 border-border/80 bg-background/50 text-body-sm font-medium min-w-[150px]">
              <SelectValue placeholder="Kursus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kursus</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-body-sm text-muted-foreground font-medium ml-1 bg-muted/65 border border-border/30 px-2.5 py-0.5 rounded-md">
            {filtered.length} Soal
          </span>
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="rounded-lg bg-brand-primary !text-white hover:bg-brand-primary/95 flex items-center gap-1.5 cursor-pointer text-body-sm font-bold shadow-sm px-4 py-2 interactive transition-all"
        >
          <Plus className="size-4" /> Tambah Soal Manual
        </Button>
      </div>

      {/* Bulk actions - Floating Overlay */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 rounded-xl border border-border/80 bg-background/90 backdrop-blur-md px-5 py-3.5 shadow-xl min-w-[320px] max-w-[90vw] animate-in slide-in-from-bottom-4 duration-300">
          <span className="text-body-sm font-bold text-foreground shrink-0">{selected.size} soal dipilih</span>
          <div className="h-4 w-px bg-border/85 shrink-0" />
          <div className="flex gap-1.5 ml-auto flex-wrap">
            {(["reviewed", "published", "flagged", "retired"] as ReviewStatus[]).map((s) => (
              <Button
                key={s}
                size="sm"
                variant="outline"
                className="rounded-lg text-xs cursor-pointer border-border/60 hover:bg-muted font-bold capitalize transition-all"
                onClick={() => bulkUpdate(s)}
                disabled={updating}
              >
                Set {s}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center gap-3 py-3 border border-border bg-muted/20 px-4 rounded-t-xl">
        <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0 transition-colors">
          {selected.size === filtered.length && filtered.length > 0 ? (
            <CheckSquare className="size-4 text-brand-primary" />
          ) : (
            <Square className="size-4" />
          )}
        </button>
        <span className="text-body-xs font-bold text-muted-foreground uppercase tracking-wider">
          Soal
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-body-sm border-x border-b border-border/60 rounded-b-xl bg-card/20">
          Tidak ada soal yang cocok dengan filter.
        </div>
      ) : (
        <div className="divide-y divide-border/60 border-x border-b border-border/60 rounded-b-xl overflow-hidden bg-card/10">
          {filtered.map((q) => (
            <QuestionRow
              key={q.id}
              question={q}
              courseMap={courseMap}
              selected={selected.has(q.id)}
              onToggle={() => toggleSelect(q.id)}
              onEdit={handleStartEdit}
              onDelete={handleStartDelete}
            />
          ))}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          DIALOGS
         ─────────────────────────────────────────────────────────────────────── */}

      {/* CREATE DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
          <DialogHeader className="p-6 pb-4 border-b border-border/60 shrink-0">
            <DialogTitle className="font-heading text-lg font-bold text-foreground">Tambah Soal Manual</DialogTitle>
            <DialogDescription>Tambahkan soal pilihan ganda baru ke bank soal secara manual.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-body-sm text-foreground">
              {/* Target course and Difficulty */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-body-xs font-semibold uppercase tracking-wider text-muted-foreground">Mata Kuliah</label>
                  <Select value={createCourseId} onValueChange={setCreateCourseId}>
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
                  <label className="text-body-xs font-semibold uppercase tracking-wider text-muted-foreground">Tingkat Kesulitan</label>
                  <Select value={createDifficulty} onValueChange={(val) => setCreateDifficulty(val as any)}>
                    <SelectTrigger className="h-10 border-border/80 bg-background/50 text-body-sm font-medium">
                      <SelectValue placeholder="Pilih Kesulitan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Prompt */}
              <div className="space-y-1.5">
                <label className="text-body-xs font-semibold uppercase tracking-wider text-muted-foreground">Pertanyaan / Prompt (Mendukung LaTeX, contoh: $x^2$)</label>
                <textarea
                  value={createPrompt}
                  onChange={(e) => setCreatePrompt(e.target.value)}
                  placeholder="Masukkan isi pertanyaan..."
                  rows={3}
                  className="w-full rounded-lg border border-border/80 bg-background/50 p-3 hover:border-border focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/30 focus:outline-none transition-all font-sans text-body-sm font-medium"
                />
              </div>

              {/* Multiple Choice Options */}
              <div className="space-y-3 rounded-xl border border-border bg-muted/5 p-5">
                <label className="text-body-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Opsi Pilihan (Isi Kelima Opsi & Pilih Opsi yang Benar)</label>
                <div className="space-y-2.5">
                  {createOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="correct-option-create"
                        checked={createCorrectIndex === idx}
                        onChange={() => setCreateCorrectIndex(idx)}
                        className="size-4 text-brand-primary cursor-pointer focus:ring-brand-primary accent-brand-primary"
                      />
                      <span className="font-bold text-muted-foreground text-body-sm w-4 text-center">{String.fromCharCode(65 + idx)}</span>
                      <Input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...createOptions];
                          next[idx] = e.target.value;
                          setCreateOptions(next);
                        }}
                        placeholder={`Masukkan Opsi ${String.fromCharCode(65 + idx)}`}
                        className="h-9 border-border/85 bg-background text-body-sm font-medium"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              <div className="space-y-1.5">
                <label className="text-body-xs font-semibold uppercase tracking-wider text-muted-foreground">Penjelasan Solusi (Mendukung LaTeX)</label>
                <textarea
                  value={createExplanation}
                  onChange={(e) => setCreateExplanation(e.target.value)}
                  placeholder="Mengapa opsi ini benar..."
                  rows={2}
                  className="w-full rounded-lg border border-border/80 bg-background/50 p-3 hover:border-border focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/30 focus:outline-none transition-all font-sans text-body-sm font-medium"
                />
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <label className="text-body-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags (Pisahkan dengan koma)</label>
                <Input
                  type="text"
                  value={createTagsStr}
                  onChange={(e) => setCreateTagsStr(e.target.value)}
                  placeholder="limit, turunan, trigonometri"
                  className="h-10 border-border/80 bg-background text-body-sm font-medium"
                />
              </div>
            </div>

            <DialogFooter className="p-6 pt-4 border-t border-border/40 bg-muted/5 flex items-center justify-end gap-2.5 shrink-0">
              <Button type="button" variant="outline" className="rounded-lg cursor-pointer font-bold" onClick={() => setCreateOpen(false)}>Batal</Button>
              <Button type="submit" disabled={submittingCreate} className="rounded-lg cursor-pointer bg-brand-primary !text-white hover:bg-brand-primary/95 font-bold px-6 shadow-sm">
                {submittingCreate ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
                Simpan Soal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
          <DialogHeader className="p-6 pb-4 border-b border-border/60 shrink-0">
            <DialogTitle className="font-heading text-lg font-bold text-foreground">Edit Soal</DialogTitle>
            <DialogDescription>Modifikasi detail pertanyaan dan pilihan jawaban di bawah ini.</DialogDescription>
          </DialogHeader>
          {editingQuestion && (
            <form onSubmit={handleEditSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-5 text-body-sm text-foreground">
                 <div className="space-y-1.5">
                  <label className="text-body-xs font-semibold uppercase tracking-wider text-muted-foreground">Tingkat Kesulitan</label>
                  <Select value={editDifficulty} onValueChange={(val) => setEditDifficulty(val as any)}>
                    <SelectTrigger className="h-10 border-border/80 bg-background/50 text-body-sm font-medium">
                      <SelectValue placeholder="Pilih Kesulitan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Prompt */}
                <div className="space-y-1.5">
                  <label className="text-body-xs font-semibold uppercase tracking-wider text-muted-foreground">Pertanyaan / Prompt (Mendukung LaTeX)</label>
                  <textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="Masukkan isi pertanyaan..."
                    rows={3}
                    className="w-full rounded-lg border border-border/80 bg-background/50 p-3 hover:border-border focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/30 focus:outline-none transition-all font-sans text-body-sm font-medium"
                  />
                </div>

                {/* Options */}
                <div className="space-y-3 rounded-xl border border-border bg-muted/5 p-5">
                  <label className="text-body-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Opsi Pilihan (Isi Kelima Opsi & Pilih Opsi yang Benar)</label>
                  <div className="space-y-2.5">
                    {editOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="correct-option-edit"
                          checked={editCorrectIndex === idx}
                          onChange={() => setEditCorrectIndex(idx)}
                          className="size-4 text-brand-primary cursor-pointer focus:ring-brand-primary accent-brand-primary"
                        />
                        <span className="font-bold text-muted-foreground text-body-sm w-4 text-center">{String.fromCharCode(65 + idx)}</span>
                        <Input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const next = [...editOptions];
                            next[idx] = e.target.value;
                            setEditOptions(next);
                          }}
                          placeholder={`Opsi ${String.fromCharCode(65 + idx)}`}
                          className="h-9 border-border/85 bg-background text-body-sm font-medium"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explanation */}
                <div className="space-y-1.5">
                  <label className="text-body-xs font-semibold uppercase tracking-wider text-muted-foreground">Penjelasan Solusi (Mendukung LaTeX)</label>
                  <textarea
                    value={editExplanation}
                    onChange={(e) => setEditExplanation(e.target.value)}
                    placeholder="Mengapa opsi ini benar..."
                    rows={2}
                    className="w-full rounded-lg border border-border/80 bg-background/50 p-3 hover:border-border focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/30 focus:outline-none transition-all font-sans text-body-sm font-medium"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                  <label className="text-body-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags (Pisahkan dengan koma)</label>
                  <Input
                    type="text"
                    value={editTagsStr}
                    onChange={(e) => setEditTagsStr(e.target.value)}
                    placeholder="limit, turunan, trigonometri"
                    className="h-10 border-border/80 bg-background text-body-sm font-medium"
                  />
                </div>
              </div>

              <DialogFooter className="p-6 pt-4 border-t border-border/40 bg-muted/5 flex items-center justify-end gap-2.5 shrink-0">
                <Button type="button" variant="outline" className="rounded-lg cursor-pointer font-bold" onClick={() => setEditOpen(false)}>Batal</Button>
                <Button type="submit" disabled={submittingEdit} className="rounded-lg cursor-pointer bg-brand-primary !text-white hover:bg-brand-primary/95 font-bold px-6 shadow-sm">
                  {submittingEdit ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md rounded-xl border border-border p-6 shadow-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-500 font-heading text-lg font-bold">
              <AlertTriangle className="size-5 shrink-0" />
              Hapus Soal
            </DialogTitle>
            <DialogDescription className="text-body-sm text-muted-foreground mt-2">
              Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin ingin menghapus soal ini dari Bank Soal?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-5 flex items-center justify-end gap-2.5">
            <Button variant="outline" className="rounded-lg cursor-pointer font-bold" onClick={() => setDeleteOpen(false)}>Batal</Button>
            <Button variant="destructive" className="rounded-lg cursor-pointer font-bold px-6 shadow-sm" onClick={handleDeleteConfirm}>Ya, Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuestionRow({
  question,
  courseMap,
  selected,
  onToggle,
  onEdit,
  onDelete,
}: {
  question: Question;
  courseMap: Record<string, string>;
  selected: boolean;
  onToggle: () => void;
  onEdit: (q: Question) => void;
  onDelete: (q: Question) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const options = Array.isArray(question.options) ? (question.options as string[]) : [];
  const correctIndices = Array.isArray(question.correctIndices)
    ? (question.correctIndices as number[])
    : [];
  const tags = Array.isArray(question.tags) ? (question.tags as string[]) : [];

  return (
    <div className={cn("py-4 transition-colors px-4 border-b border-border/55 last:border-b-0", selected ? "bg-muted/15" : "hover:bg-muted/5")}>
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0 cursor-pointer transition-colors"
        >
          {selected ? <CheckSquare className="size-4.5 text-brand-primary" /> : <Square className="size-4.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap text-body-xs font-semibold">
            <span
              className={cn("rounded-md px-2 py-0.5 uppercase tracking-wide border border-current/10 font-bold", statusColors[question.reviewStatus])}
            >
              {question.reviewStatus}
            </span>
            <span className={cn(difficultyColors[question.difficulty], "uppercase text-[10px]")}>
              {question.difficulty}
            </span>
            <span className="text-muted-foreground font-medium bg-muted/40 px-1.5 py-0.5 rounded-md">
              {courseMap[question.courseId] ?? question.courseId}
            </span>
            <span className="text-muted-foreground ml-auto font-medium text-[11px] normal-case">
              used {question.useCount}×
            </span>
          </div>

          {expanded ? (
            <div className="mt-3 border-l-2 border-brand-primary/40 pl-3">
              <MarkdownRenderer content={question.prompt} className="text-body-sm text-foreground font-medium" />
            </div>
          ) : (
            <p className="text-body-sm text-foreground mt-2 line-clamp-2 font-medium leading-relaxed font-sans">
              {question.prompt}
            </p>
          )}

          {tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-2.5">
              {tags.map((t) => (
                <span key={t} className="rounded bg-muted/65 border border-border/20 px-1.5 py-0.5 text-body-xs font-semibold text-muted-foreground/90">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer p-1 rounded-md hover:bg-muted"
        >
          {expanded ? <ChevronUp className="size-4.5" /> : <ChevronDown className="size-4.5" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 ml-7.5 space-y-4 border-t border-border/40 pt-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((opt, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3 text-body-sm rounded-lg px-3.5 py-2.5 border transition-all duration-200",
                  correctIndices.includes(i)
                    ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium"
                    : "text-muted-foreground border-border/30 hover:border-border/60 bg-muted/5"
                )}
              >
                <span className="font-bold font-sans text-muted-foreground/80 shrink-0">{String.fromCharCode(65 + i)}.</span>
                <MarkdownRenderer content={opt} className="flex-1 text-body-sm leading-relaxed" />
              </div>
            ))}
          </div>
          {question.explanation && (
            <div className="rounded-xl bg-muted/20 p-4 border border-border/60">
              <p className="text-body-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Penjelasan</p>
              <MarkdownRenderer content={question.explanation} className="text-body-sm text-foreground/80 leading-relaxed font-sans" />
            </div>
          )}
          
          <div className="flex gap-2 justify-end pt-3 border-t border-border/40">
            <Button size="sm" variant="outline" className="rounded-lg gap-1.5 cursor-pointer text-xs font-bold" onClick={() => onEdit(question)}>
              <Edit2 className="size-3.5" /> Edit Soal
            </Button>
            <Button size="sm" variant="destructive" className="rounded-lg gap-1.5 cursor-pointer text-xs font-bold animate-colors" onClick={() => onDelete(question)}>
              <Trash2 className="size-3.5" /> Hapus Soal
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
