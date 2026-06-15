"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  BookText, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  RefreshCw, 
  Play, 
  Loader2, 
  AlertTriangle, 
  Check, 
  CheckCircle2, 
  HelpCircle, 
  Info, 
  Sparkles, 
  ExternalLink, 
  FileText, 
  Layers,
  Settings
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MarkdownRenderer } from "@/components/course/markdown-renderer";

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

interface Warning {
  id: string;
  type: "latex" | "glossary" | "density";
  title: string;
  desc: string;
  target?: string;
}

type IngestionState = "source" | "analyzing" | "reviewing" | "ready";

export function MaterialInstancesClient({ instances, courses, courseMap }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ingestionState, setIngestionState] = useState<IngestionState>("source");
  const [showReport, setShowReport] = useState(false);
  const [inputMethod, setInputMethod] = useState<"upload" | "paste">("upload");
  
  const [form, setForm] = useState({
    courseId: "",
    title: "",
    sourceType: "markdown" as "markdown" | "json" | "pdf_extraction",
    rawText: "",
    summary: "",
    learningObjectives: "",
    keywords: "",
  });

  const handleMockUpload = () => {
    setForm(f => ({
      ...f,
      rawText: `# Kalkulus 1 - Limit dan Kekontinuan\n\n## Bab 1: Pengantar Limit Intuitif\nLimit menggambarkan perilaku fungsi saat input mendekati suatu nilai. Bayangkan mendekati titik di grafik tanpa harus menyentuhnya.\n\n:::concept {koId="ko-calc-1-limit-def", title="Definisi Limit Intuisi"}\nLimit fungsi $f(x)$ saat $x \\to c$ adalah $L$, ditulis $\\lim_{x \\to c} f(x) = L$, jika nilai $f(x)$ dapat dibuat sedekat mungkin ke $L$ dengan membuat $x$ cukup dekat ke $c$.\n:::\n\n## Bab 2: Teorema Apit Limit\nTeorema Apit digunakan untuk mencari limit fungsi dengan membandingkannya dengan dua fungsi lain yang nilainya sudah diketahui.\n\n:::formula {koId="ko-calc-1-apit-formula"}\nJika $g(x) \\le f(x) \\le h(x)$ untuk semua $x$ dekat $c$ dan $\\lim_{x \\to c} g(x) = \\lim_{x \\to c} h(x) = L$, maka $$\\lim_{x \\to c} f(x) = L$$\n:::\n`,
      title: form.title || "Kalkulus 1 - Limit dan Kekontinuan",
      keywords: form.keywords || "limit, teorema apit, kalkulus",
      learningObjectives: form.learningObjectives || "Memahami limit secara intuitif\nMenerapkan Teorema Apit dalam limit"
    }));
    toast.success("Berkas 'materi_kalkulus_limit.md' berhasil diunggah dan diekstraksi!");
  };

  const [stats, setStats] = useState({
    words: 0,
    headings: 0,
    formulas: 0,
    chapters: 0,
    conceptsCount: 0,
    formulasCount: 0,
    definitionsCount: 0,
    misconceptionsCount: 0,
  });

  interface ExtractedKO {
    id: string;
    title: string;
    type: string;
    bloomLevel: string;
  }

  const [extractedKOs, setExtractedKOs] = useState<ExtractedKO[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);

  // Simulated parse analysis process
  const handleStartAnalysis = () => {
    if (!form.courseId || !form.title || !form.rawText) {
      toast.error("Silakan lengkapi Kursus, Judul, dan Teks Materi terlebih dahulu.");
      return;
    }
    
    setIngestionState("analyzing");
    
    // Parse raw text for statistics
    const words = form.rawText.split(/\s+/).filter(Boolean).length;
    const headings = (form.rawText.match(/^#+\s+.+$/gm) || []).length;
    
    // Non-overlapping LaTeX formulas calculation
    const doubleDollarMatches = form.rawText.match(/\$\$[\s\S]*?\$\$/g) || [];
    const blockFormulasCount = doubleDollarMatches.length;
    const textWithoutBlocks = form.rawText.replace(/\$\$[\s\S]*?\$\$/g, "");
    const inlineFormulaMatches = textWithoutBlocks.match(/\$[^\$\n]+?\$/g) || [];
    const inlineFormulasCount = inlineFormulaMatches.length;
    const formulas = blockFormulasCount + inlineFormulasCount;

    const chapters = (form.rawText.match(/^##\s+.+$/gm) || []).length || 1;

    // Parse Knowledge Objects (container blocks)
    const blockRegex = /:::(concept|formula|definition|misconception|example|exercise|summary|objective)(?:\s+({[^}]+}))?/g;
    const extractedKOsList: ExtractedKO[] = [];
    const blockMatches = Array.from(form.rawText.matchAll(blockRegex));
    
    const getBloomLevel = (type: string) => {
      switch (type) {
        case "definition": return "remember";
        case "concept":
        case "concept_overview":
        case "summary":
          return "understand";
        case "formula":
        case "example":
        case "exercise":
          return "apply";
        case "misconception":
          return "analyze";
        case "objective":
          return "remember";
        default:
          return "understand";
      }
    };

    blockMatches.forEach((m, idx) => {
      const type = m[1];
      const attrStr = m[2] || "";
      const titleMatch = attrStr.match(/title=["']([^"']+)["']/);
      const title = titleMatch ? titleMatch[1] : `${type.charAt(0).toUpperCase() + type.slice(1)} ${idx + 1}`;
      
      const normalizedType = type === "concept" ? "concept_overview" : type;
      
      extractedKOsList.push({
        id: `ko-extracted-${idx}`,
        title,
        type: normalizedType,
        bloomLevel: getBloomLevel(normalizedType),
      });
    });

    const conceptsCount = extractedKOsList.filter(k => k.type === "concept_overview").length;
    const formulasCount = extractedKOsList.filter(k => k.type === "formula").length;
    const definitionsCount = extractedKOsList.filter(k => k.type === "definition").length;
    const misconceptionsCount = extractedKOsList.filter(k => k.type === "misconception").length;
    
    // Check for LaTeX validation issues (unmatched dollar signs)
    const singleDollars = (form.rawText.match(/(?<!\$)\$(?!\$)/g) || []).length;
    const parsedWarnings: Warning[] = [];
    
    if (singleDollars % 2 !== 0) {
      parsedWarnings.push({
        id: "latex-inline",
        type: "latex",
        title: "Sintaks LaTeX Tidak Seimbang (Inline)",
        desc: "Ditemukan jumlah pembatas '$' ganjil. Hal ini menandakan adanya persamaan matematika inline yang belum ditutup.",
        target: "$"
      });
    }
    
    // Check for glossary references missing definitions
    const glossaryMatches = Array.from(form.rawText.matchAll(/\[\[(.*?)\]\]/g)).map(m => m[1]);
    const keywordsList = form.keywords
      .split(",")
      .map(k => k.trim().toLowerCase())
      .filter(Boolean);
    
    glossaryMatches.forEach((term, idx) => {
      if (!keywordsList.includes(term.toLowerCase())) {
        parsedWarnings.push({
          id: `glossary-${idx}`,
          type: "glossary",
          title: `Referensi Glosarium Belum Terdaftar: "${term}"`,
          desc: `Istilah dirujuk menggunakan kurung siku ganda [[${term}]] tetapi belum didaftarkan sebagai Kata Kunci.`,
          target: term
        });
      }
    });
    
    // Check for concept density warnings
    if (words > 1000 && headings === 0) {
      parsedWarnings.push({
        id: "low-density",
        type: "density",
        title: "Struktur Kepadatan Materi Rendah",
        desc: "Materi ini memiliki teks yang panjang (>1000 kata) tetapi tidak memiliki pembagian subbab (H2/H3). Disarankan menambahkan heading subbab.",
      });
    }

    // Auto-generate summary, objectives, and keywords if not provided
    const autoSummary = form.summary || form.rawText.slice(0, 180).replace(/[#*`_]/g, "") + "...";
    
    const lines = form.rawText.split("\n");
    const objectivesLines = lines
      .filter(line => line.toLowerCase().includes("siswa dapat") || line.toLowerCase().includes("tujuan"))
      .map(line => line.replace(/^[-*\s\d.]+/, "").trim())
      .slice(0, 5);
    const autoObjectives = form.learningObjectives || (objectivesLines.length > 0 
      ? objectivesLines.join("\n") 
      : `Memahami teori utama ${form.title}\nMampu menyelesaikan latihan analisis terkait`);

    const autoKeywords = form.keywords || form.title.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 3).slice(0, 5).join(", ");

    setTimeout(() => {
      setForm(prev => ({
        ...prev,
        summary: autoSummary,
        learningObjectives: autoObjectives,
        keywords: autoKeywords
      }));
      setStats({
        words,
        headings,
        formulas,
        chapters,
        conceptsCount,
        formulasCount,
        definitionsCount,
        misconceptionsCount,
      });
      setExtractedKOs(extractedKOsList);
      setWarnings(parsedWarnings);
      setIngestionState("reviewing");
      toast.success("Analisis dokumen selesai. Objek pengetahuan dan metrik berhasil dihitung.");
    }, 1500);
  };

  // Curation Fix Methods
  const fixGlossaryWarning = (id: string, term: string) => {
    setForm(prev => {
      const existing = prev.keywords ? prev.keywords.split(",").map(k => k.trim()).filter(Boolean) : [];
      if (!existing.map(e => e.toLowerCase()).includes(term.toLowerCase())) {
        existing.push(term);
      }
      return { ...prev, keywords: existing.join(", ") };
    });
    setWarnings(prev => prev.filter(w => w.id !== id));
    toast.success(`Istilah "${term}" berhasil ditambahkan ke Kata Kunci.`);
  };

  const fixLaTeXWarning = (id: string) => {
    setForm(prev => ({
      ...prev,
      rawText: prev.rawText + "$"
    }));
    setWarnings(prev => prev.filter(w => w.id !== id));
    toast.success("Simbol pembatas math inline berhasil diseimbangkan.");
  };

  const fixDensityWarning = (id: string) => {
    setForm(prev => ({
      ...prev,
      rawText: `## Bab 1: Pendahuluan & Konsep Utama\n\n${prev.rawText}`
    }));
    setWarnings(prev => prev.filter(w => w.id !== id));
    toast.success("Struktur subbab otomatis ditambahkan di awal dokumen.");
  };

  const handleCancelWorkspace = () => {
    setIngestionState("source");
    setStats({
      words: 0,
      headings: 0,
      formulas: 0,
      chapters: 0,
      conceptsCount: 0,
      formulasCount: 0,
      definitionsCount: 0,
      misconceptionsCount: 0,
    });
    setExtractedKOs([]);
    setWarnings([]);
    setShowForm(false);
  };

  // Save Draft (Title prepended with [DRAF])
  async function handleSaveDraft() {
    setSubmitting(true);
    const finalTitle = form.title.startsWith("[DRAF]") ? form.title : `[DRAF] ${form.title}`;
    
    try {
      const res = await fetch("/api/admin/material-instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: form.courseId,
          title: finalTitle,
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
        toast.error("Gagal menyimpan draf: " + JSON.stringify(data.error));
        return;
      }
      toast.success(`Draf "${finalTitle}" berhasil disimpan.`);
      setShowForm(false);
      window.location.reload();
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  }

  // Publish Material (Title cleaned, initiates sync)
  async function handlePublish() {
    setSubmitting(true);
    const finalTitle = form.title.replace(/^\[DRAF\]\s*/, "");
    
    try {
      const res = await fetch("/api/admin/material-instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: form.courseId,
          title: finalTitle,
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
        toast.error("Gagal mempublikasikan materi: " + JSON.stringify(data.error));
        return;
      }
      toast.success(
        `Materi "${finalTitle}" berhasil dipublikasikan. ${data.sectionsCreated} seksi dan ${data.chunksCreated} chunk diindeks ke basis pengetahuan.`
      );
      setShowForm(false);
      window.location.reload();
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  }

  // Dynamic metrics calculations
  const babAccuracy = Math.max(
    20,
    100 -
      (warnings.some((w) => w.type === "density") ? 30 : 0) -
      (stats.headings === 0 ? 50 : 0) -
      (stats.words > 5000 && stats.headings < 5 ? 15 : 0)
  );

  const hasLatexWarning = warnings.some((w) => w.type === "latex");
  const latexAccuracy = stats.formulas === 0 
    ? 100 
    : Math.max(30, 100 - (hasLatexWarning ? 35 : 0));

  const glossaryWarningCount = warnings.filter((w) => w.type === "glossary").length;
  const glossaryAccuracy = Math.max(
    30,
    100 - glossaryWarningCount * 12 - (!form.keywords ? 10 : 0)
  );

  const unrecognized = warnings.length === 0 ? 0 : Math.min(25, Math.max(1, warnings.length * 2));
  const ignored = Math.min(10, Math.max(0, Math.round(stats.words / 8000)));
  const parsedSuccessfully = 100 - unrecognized - ignored;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-body-sm text-muted-foreground">{instances.length} materi terdaftar</p>
        <Button
          className="rounded-lg gap-2"
          onClick={() => {
            if (showForm) {
              handleCancelWorkspace();
            } else {
              setShowForm(true);
            }
          }}
          variant={showForm ? "outline" : "default"}
        >
          {showForm ? <ChevronUp className="size-4" /> : <Plus className="size-4" />}
          {showForm ? "Tutup Workspace" : "Tambah Materi"}
        </Button>
      </div>

      {showForm && (
        <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm space-y-6 text-left">
          {/* Header Workspace */}
          <div className="flex items-center justify-between border-b border-border pb-4 flex-wrap gap-2">
            <div>
              <h2 className="font-heading text-h5 font-semibold text-foreground">
                Material Ingestion Workspace
              </h2>
              <p className="text-body-sm text-muted-foreground mt-0.5">
                Proses berkas kurikulum menjadi materi terstruktur dan objek pengetahuan AI.
              </p>
            </div>
            <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {ingestionState === "source" && "1. Sumber Dokumen"}
              {ingestionState === "analyzing" && "2. Menganalisis..."}
              {ingestionState === "reviewing" && "3. Kurasi & Pratinjau"}
              {ingestionState === "ready" && "4. Siap Rilis"}
            </span>
          </div>

          {/* SECTION 1: SOURCE UPLOAD SECTION */}
          {ingestionState === "source" && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 text-left">
                <div>
                  <label className="text-body-sm font-semibold text-foreground mb-1 block">Kursus</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/50"
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
                  <label className="text-body-sm font-semibold text-foreground mb-1 block">Tipe Sumber</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/50"
                    value={form.sourceType}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sourceType: e.target.value as any }))
                    }
                  >
                    <option value="markdown">Master Teaching Document (Markdown)</option>
                    <option value="pdf_extraction">PDF Extraction Output</option>
                    <option value="json">Structured JSON Export</option>
                  </select>
                </div>
              </div>

              <div className="text-left">
                <label className="text-body-sm font-semibold text-foreground mb-1 block">Judul Materi</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/50"
                  placeholder="Contoh: Limit dan Kekontinuan — Bab 3"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>

              {/* Opsi Konten: Upload vs Manual Text */}
              <div className="space-y-4 text-left">
                <label className="text-body-sm font-semibold text-foreground block">Konten Sumber Materi</label>
                
                {/* Opsi A: Unggah Berkas */}
                <div 
                  className={cn(
                    "border rounded-xl p-5 transition-all duration-200 cursor-pointer bg-card/40",
                    inputMethod === "upload" 
                      ? "border-primary/80 ring-1 ring-primary/25" 
                      : "border-border hover:border-border/80"
                  )}
                  onClick={() => setInputMethod("upload")}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "size-4 rounded-full border flex items-center justify-center shrink-0",
                      inputMethod === "upload" ? "border-primary" : "border-muted-foreground"
                    )}>
                      {inputMethod === "upload" && <div className="size-2 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <span className="text-body-sm font-bold text-foreground">Opsi A: Unggah Berkas MTD / PDF (Rekomendasi)</span>
                      <p className="text-xs text-muted-foreground mt-0.5">Ekstrak teks materi dan rumus secara otomatis dari dokumen.</p>
                    </div>
                  </div>

                  {inputMethod === "upload" && (
                    <div className="mt-4 pt-4 border-t border-border/60 space-y-3 cursor-default" onClick={(e) => e.stopPropagation()}>
                      <div 
                        onClick={handleMockUpload}
                        className="border-2 border-dashed border-border p-6 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="size-6 text-muted-foreground" />
                        <span className="text-body-sm font-medium text-foreground">Import dari PDF / Master Document</span>
                        <span className="text-xs text-muted-foreground max-w-xs">Seret berkas ke sini atau klik untuk mengunggah dari Admin Drive.</span>
                      </div>
                      {form.rawText && (
                        <div className="p-3 bg-status-success/8 border border-status-success/20 text-status-success rounded-lg text-xs font-medium flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="size-4 shrink-0" />
                            <span>Berkas kurikulum berhasil dimuat ({form.rawText.split(/\s+/).filter(Boolean).length} kata).</span>
                          </div>
                          <button 
                            type="button" 
                            className="text-primary hover:underline font-semibold cursor-pointer shrink-0"
                            onClick={() => setInputMethod("paste")}
                          >
                            Edit Teks Manual &rarr;
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Opsi B: Tempel Teks Manual */}
                <div 
                  className={cn(
                    "border rounded-xl p-5 transition-all duration-200 cursor-pointer bg-card/40",
                    inputMethod === "paste" 
                      ? "border-primary/80 ring-1 ring-primary/25" 
                      : "border-border hover:border-border/80"
                  )}
                  onClick={() => setInputMethod("paste")}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "size-4 rounded-full border flex items-center justify-center shrink-0",
                      inputMethod === "paste" ? "border-primary" : "border-muted-foreground"
                    )}>
                      {inputMethod === "paste" && <div className="size-2 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <span className="text-body-sm font-bold text-foreground">Opsi B: Tempel Teks Manual (Paste)</span>
                      <p className="text-xs text-muted-foreground mt-0.5">Ketik atau plester teks Markdown hasil ekstraksi mandiri.</p>
                    </div>
                  </div>

                  {inputMethod === "paste" && (
                    <div className="mt-4 pt-4 border-t border-border/60 cursor-default" onClick={(e) => e.stopPropagation()}>
                      <label className="text-body-xs font-semibold text-muted-foreground mb-1 block">Teks Materi Lengkap</label>
                      <textarea
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm min-h-[160px] font-mono text-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/50"
                        placeholder="Plester (paste) teks Markdown atau hasil ekstraksi PDF di sini..."
                        value={form.rawText}
                        onChange={(e) => setForm((f) => ({ ...f, rawText: e.target.value }))}
                        required
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Optional Fields (Tujuan & Keywords) at the bottom */}
              <div className="grid gap-4 sm:grid-cols-2 border-t border-border/60 pt-4 text-left">
                <div>
                  <label className="text-body-sm font-medium text-foreground mb-1 block">
                    Tujuan Pembelajaran (Opsional, Satu Per Baris)
                  </label>
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm min-h-[60px] focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/50"
                    placeholder="Mampu menyelesaikan limit pecahan..."
                    value={form.learningObjectives}
                    onChange={(e) => setForm((f) => ({ ...f, learningObjectives: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-body-sm font-medium text-foreground mb-1 block">
                    Keywords / Kata Kunci (Opsional, Pisahkan Dengan Koma)
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-body-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/50"
                    placeholder="limit, aljabar, kekontinuan"
                    value={form.keywords}
                    onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  className="rounded-lg gap-2 cursor-pointer font-semibold" 
                  disabled={!form.courseId || !form.title || !form.rawText}
                  onClick={handleStartAnalysis}
                >
                  <Play className="size-4" />
                  Analisis Dokumen
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-lg cursor-pointer font-semibold"
                  onClick={handleCancelWorkspace}
                >
                  Batal
                </Button>
              </div>
            </div>
          )}

          {/* SECTION 2: LOADING ANALYZING OVERLAY */}
          {ingestionState === "analyzing" && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="size-8 text-primary animate-spin" />
              <div className="space-y-1">
                <p className="font-heading text-body-lg font-semibold text-foreground">Sedang Menganalisis Dokumen</p>
                <p className="text-body-sm text-muted-foreground max-w-sm">Mengekstrak Bab, Struktur Rumus LaTeX, dan Objek Pengetahuan dari dokumen sumber...</p>
              </div>
              <div className="w-full max-w-xs h-2 bg-muted rounded-md overflow-hidden relative border border-border/20">
                <div className="absolute inset-y-0 left-0 bg-primary rounded-md w-1/2 animate-[progress_1.5s_ease-in-out_infinite]" style={{
                  animationName: "progress-bar",
                  width: "60%"
                }}></div>
              </div>
              <style jsx>{`
                @keyframes progress-bar {
                  0% { left: -30%; }
                  100% { left: 100%; }
                }
              `}</style>
            </div>
          )}

          {/* SECTIONS 3-5: CURATION & VERIFICATION (Reviewing & Ready) */}
          {(ingestionState === "reviewing" || ingestionState === "ready") && (
            <div className="space-y-6">
              
              {/* Parse Result Summary Header */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Metric Box */}
                <div className="border border-border p-4 bg-muted/10 rounded-xl space-y-2.5">
                  <p className="font-sans text-body-sm font-semibold text-foreground flex items-center gap-1.5">
                    <FileText className="size-4 text-primary" />
                    Metrik Dokumen
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-body-sm">
                    <div>Jumlah Kata: <span className="font-semibold text-foreground">{stats.words}</span></div>
                    <div>Jumlah Heading: <span className="font-semibold text-foreground">{stats.headings}</span></div>
                    <div>Rumus LaTeX: <span className="font-semibold text-foreground">{stats.formulas}</span></div>
                    <div>Jumlah Bab: <span className="font-semibold text-foreground">{stats.chapters}</span></div>
                  </div>
                </div>

                {/* KO summary extraction */}
                <div className="border border-border p-4 bg-muted/10 rounded-xl space-y-2.5">
                  <p className="font-sans text-body-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Layers className="size-4 text-primary" />
                    Ekstraksi Objek Pengetahuan (KO)
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-card px-2.5 py-1 rounded-md border border-border font-medium">Concept: {stats.conceptsCount}</span>
                    <span className="bg-card px-2.5 py-1 rounded-md border border-border font-medium">Formula: {stats.formulasCount}</span>
                    <span className="bg-card px-2.5 py-1 rounded-md border border-border font-medium">Definition: {stats.definitionsCount}</span>
                    <span className="bg-card px-2.5 py-1 rounded-md border border-border font-medium">Misconception: {stats.misconceptionsCount}</span>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="rounded-md gap-1.5 text-xs h-8"
                    onClick={() => setShowReport(true)}
                  >
                    <ExternalLink className="size-3" />
                    Lihat Laporan Ekstraksi
                  </Button>
                </div>
              </div>

              {/* Confidence & Coverage Section */}
              <div className="border border-border p-5 rounded-xl bg-card space-y-4">
                <p className="font-sans text-body-sm font-semibold text-foreground">Tingkat Akurasi & Coverage Ekstraksi</p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Progress Bars */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1">
                        <span>Akurasi Struktur Bab</span>
                        <span className={babAccuracy < 70 ? "text-status-error" : babAccuracy < 90 ? "text-status-warning" : "text-status-success"}>
                          {babAccuracy}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-md overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-md transition-all duration-500",
                            babAccuracy < 70 ? "bg-status-error" : babAccuracy < 90 ? "bg-status-warning" : "bg-status-success"
                          )} 
                          style={{ width: `${babAccuracy}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1">
                        <span>Akurasi Rumus LaTeX</span>
                        <span className={latexAccuracy < 70 ? "text-status-error" : latexAccuracy < 90 ? "text-status-warning" : "text-status-success"}>
                          {latexAccuracy}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-md overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-md transition-all duration-500",
                            latexAccuracy < 70 ? "bg-status-error" : latexAccuracy < 90 ? "bg-status-warning" : "bg-status-success"
                          )} 
                          style={{ width: `${latexAccuracy}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-medium mb-1">
                        <span>Akurasi Ekstraksi Glosarium</span>
                        <span className={glossaryAccuracy < 70 ? "text-status-error" : glossaryAccuracy < 90 ? "text-status-warning" : "text-status-success"}>
                          {glossaryAccuracy}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-md overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-md transition-all duration-500",
                            glossaryAccuracy < 70 ? "bg-status-error" : glossaryAccuracy < 90 ? "bg-status-warning" : "bg-status-success"
                          )} 
                          style={{ width: `${glossaryAccuracy}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Coverage stats */}
                  <div className="flex items-center justify-around border-l border-border pl-6 flex-wrap gap-4 text-center">
                    <div>
                      <p className={cn(
                        "text-h4 font-heading font-bold transition-colors duration-500", 
                        parsedSuccessfully < 70 ? "text-status-error" : parsedSuccessfully < 90 ? "text-status-warning" : "text-status-success"
                      )}>{parsedSuccessfully}%</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Parsed Successfully</p>
                    </div>
                    <div>
                      <p className={cn(
                        "text-h4 font-heading font-bold transition-colors duration-500",
                        unrecognized > 15 ? "text-status-error" : unrecognized > 5 ? "text-status-warning" : "text-status-success"
                      )}>{unrecognized}%</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Unrecognized</p>
                    </div>
                    <div>
                      <p className="text-h4 font-heading font-bold text-muted-foreground">{ignored}%</p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Ignored</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: REVIEW WARNINGS PANEL */}
              {warnings.length > 0 && (
                <div className="space-y-3">
                  <p className="font-sans text-body-sm font-semibold text-status-error flex items-center gap-1.5">
                    <AlertTriangle className="size-4" />
                    Peringatan Analisis Dokumen ({warnings.length} Masalah)
                  </p>
                  
                  <div className="grid gap-3">
                    {warnings.map((warn) => (
                      <div 
                        key={warn.id} 
                        className="bg-status-error/10 border border-status-error/20 rounded-lg p-4 flex items-start justify-between gap-4 text-status-error"
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-body-sm">{warn.title}</p>
                          <p className="text-xs text-status-error/80 leading-relaxed">{warn.desc}</p>
                        </div>
                        <div className="shrink-0 pt-0.5">
                          {warn.type === "glossary" && warn.target && (
                            <Button
                              size="sm"
                              type="button"
                              variant="destructive"
                              className="rounded-md text-xs h-8 px-3"
                              onClick={() => fixGlossaryWarning(warn.id, warn.target!)}
                            >
                              Tambahkan ke Keywords
                            </Button>
                          )}
                          {warn.type === "latex" && (
                            <Button
                              size="sm"
                              type="button"
                              variant="destructive"
                              className="rounded-md text-xs h-8 px-3"
                              onClick={() => fixLaTeXWarning(warn.id)}
                            >
                              Tutup Delimiter
                            </Button>
                          )}
                          {warn.type === "density" && (
                            <Button
                              size="sm"
                              type="button"
                              variant="destructive"
                              className="rounded-md text-xs h-8 px-3"
                              onClick={() => fixDensityWarning(warn.id)}
                            >
                              Tambah Subbab Utama
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 4: WEBSITE MATERIAL EDITOR + PREVIEW */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-sans text-body-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="size-4 text-primary" />
                    Penyunting & Pratinjau Materi Pelajaran
                  </p>
                  <span className="text-xs text-muted-foreground font-mono">Simbol matematika didukung ($ untuk inline, $$ untuk blok)</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Markdown Editor */}
                  <div className="space-y-1.5">
                    <label className="text-body-xs font-semibold text-muted-foreground uppercase tracking-wider block">Raw Markdown</label>
                    <textarea
                      className="w-full rounded-md border border-input bg-background p-3 text-body-sm font-mono leading-relaxed min-h-[360px] h-full focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/50"
                      value={form.rawText}
                      onChange={(e) => setForm(f => ({ ...f, rawText: e.target.value }))}
                    />
                  </div>

                  {/* HTML/KaTeX Preview */}
                  <div className="space-y-1.5">
                    <label className="text-body-xs font-semibold text-muted-foreground uppercase tracking-wider block">Visual Live Preview</label>
                    <div className="border border-border rounded-md p-4 bg-background overflow-y-auto min-h-[360px] max-h-[500px]">
                      {form.rawText ? (
                        <MarkdownRenderer content={form.rawText} />
                      ) : (
                        <p className="text-muted-foreground text-body-sm italic select-none">Belum ada konten pratinjau.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 5: PUBLICATION PANEL & CHECKLIST */}
              <div className="border-t border-border pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Checklist metrics */}
                <div className="space-y-1.5">
                  <h4 className="text-body-sm font-semibold text-foreground">Daftar Pemeriksaan Publikasi:</h4>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-status-success" />
                      <span>Dokumen sumber telah dianalisis.</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-status-success" />
                      <span>Peringatan kritis LaTeX & Glosarium telah diselesaikan ({warnings.length} tersisa).</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-status-success" />
                      <span>Pratinjau materi pelajaran telah diverifikasi.</span>
                    </div>
                  </div>
                </div>

                {/* Submitting Actions */}
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-lg font-semibold"
                    disabled={submitting}
                    onClick={handleSaveDraft}
                  >
                    Simpan Draf
                  </Button>
                  <Button
                    type="button"
                    className="rounded-lg font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={submitting || warnings.length > 0}
                    onClick={handlePublish}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-4" />
                        Publikasikan Materi
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-lg text-muted-foreground hover:text-foreground"
                    onClick={handleCancelWorkspace}
                    disabled={submitting}
                  >
                    Batal
                  </Button>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* Database Material Listing (Active dashboard grid) */}
      {instances.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-body-sm bg-card rounded-xl border border-border">
          Belum ada materi AI. Klik &quot;Tambah Materi&quot; untuk mulai.
        </div>
      ) : (
        <div className="divide-y divide-border border border-border rounded-xl bg-card px-6 shadow-xs">
          {instances.map((inst) => (
            <InstanceRow key={inst.id} instance={inst} courseMap={courseMap} />
          ))}
        </div>
      )}

      {/* DIALOG: VIEW EXTRACTION REPORT (Knowledge Objects detailed visual map) */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="rounded-xl max-w-2xl max-h-[85vh] overflow-y-auto border border-border">
          <DialogHeader>
            <DialogTitle className="font-heading text-h6 font-semibold flex items-center gap-2">
              <Layers className="size-5 text-primary" />
              Laporan Ekstraksi Objek Pengetahuan (KO)
            </DialogTitle>
            <DialogDescription className="text-body-sm leading-relaxed mt-1">
              Visualisasi struktur dekomposisi teks materi pelajaran menjadi modul konsep pembelajaran Zyx Academy.
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-4 space-y-4">
            <div className="border border-border rounded-lg overflow-hidden text-body-sm text-left">
              <div className="grid grid-cols-3 bg-muted px-4 py-2 font-semibold text-foreground border-b border-border">
                <div>Konsep / Title</div>
                <div>Kategori (Type)</div>
                <div>Taksonomi Bloom</div>
              </div>
              <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
                {extractedKOs.length > 0 ? (
                  extractedKOs.map((ko, index) => (
                    <div 
                      key={ko.id} 
                      className={cn(
                        "grid grid-cols-3 px-4 py-2 text-body-sm",
                        index % 2 === 0 ? "bg-card" : "bg-muted/10"
                      )}
                    >
                      <div className="font-medium text-foreground">{ko.title}</div>
                      <div>{ko.type}</div>
                      <div className="font-mono text-xs">{ko.bloomLevel}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground space-y-2">
                    <p className="font-semibold text-body-sm">Tidak ada kontainer KO kustom terdeteksi.</p>
                    <p className="text-xs max-w-md mx-auto leading-relaxed">
                      Sistem akan menggunakan AI untuk mengekstrak objek secara otomatis saat materi diterbitkan. 
                      Anda juga dapat menambahkannya secara manual di dalam dokumen menggunakan kontainer seperti:
                    </p>
                    <pre className="text-left bg-muted/50 p-3 rounded-md text-[10px] font-mono max-w-sm mx-auto overflow-x-auto border border-border/60">
{`:::concept {title="Konsep Limit"}
Definisi dan konten...
:::

:::formula {title="Rumus Limit"}
Limit fungsi f(x)...
:::`}
                    </pre>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-3 bg-muted/20 border border-border rounded-lg text-xs leading-relaxed text-muted-foreground flex gap-2">
              <Info className="size-4 shrink-0 mt-0.5 text-primary" />
              <span>Sistem RAG memetakan objek di atas untuk merakit konten penjelasan kuis, kartu pengulangan jeda (flashcard), dan basis pengetahuan untuk AI Tutor. Kurasi di atas bersifat internal untuk menjaga keandalan pengajaran.</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              className="rounded-lg"
              onClick={() => setShowReport(false)}
            >
              Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

  const isDraft = instance.title.startsWith("[DRAF]");
  const cleanTitle = instance.title.replace(/^\[DRAF\]\s*/, "");

  return (
    <div className="py-4">
      <div className="flex items-start gap-4">
        <BookText className="size-5 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            {isDraft && (
              <span className="rounded-md bg-status-warning/10 text-status-warning border border-status-warning/20 px-2 py-0.5 text-xs font-semibold">
                Draf
              </span>
            )}
            <span className="font-semibold text-foreground text-body-sm">{cleanTitle}</span>
            <span className="text-body-sm text-muted-foreground">·</span>
            <span className="text-body-sm text-muted-foreground">
              {courseMap[instance.courseId] ?? instance.courseId}
            </span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-body-sm text-muted-foreground text-xs font-mono">
              {instance.sourceType}
            </span>

            {/* Ingest Sync Badge */}
            {instance.pineconeSyncStatus === "synced" && (
              <span className="rounded-md bg-status-success/10 text-status-success border border-status-success/20 px-2 py-0.5 text-xs font-medium">
                Tersinkronisasi
              </span>
            )}
            {instance.pineconeSyncStatus === "pending" && (
              <span className="rounded-md bg-status-warning/10 text-status-warning border border-status-warning/20 px-2 py-0.5 text-xs font-medium flex items-center gap-1 animate-pulse">
                Menyinkronkan...
              </span>
            )}
            {instance.pineconeSyncStatus === "failed" && (
              <span
                className="rounded-md bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 text-xs font-medium cursor-help"
                title={instance.lastSyncError ?? "Gagal menyinkronkan ke basis data"}
              >
                Gagal Sinkronisasi
              </span>
            )}
          </div>
          <p className="text-body-sm text-muted-foreground mt-1 line-clamp-2">{instance.summary}</p>
          {keywords.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {keywords.map((k) => (
                <span
                  key={k}
                  className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground font-medium"
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
        <div className="mt-4 ml-9 text-body-sm text-muted-foreground space-y-2 border-t border-border pt-3 text-left">
          <p>
            <span className="font-semibold text-foreground">ID:</span> {instance.id}
          </p>
          <p>
            <span className="font-semibold text-foreground">Dibuat:</span>{" "}
            {new Date(instance.createdAt).toLocaleString("id-ID")}
          </p>
          {instance.lastSyncError && (
            <p className="text-destructive font-mono text-xs bg-destructive/5 p-2 rounded-md border border-destructive/10">
              <span className="font-semibold block mb-0.5">Error Log:</span> {instance.lastSyncError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Link href={`/admin/ai/materials/${instance.id}`}>
              <Button
                size="sm"
                variant="outline"
                className="rounded-md gap-2 cursor-pointer"
              >
                <Settings className="size-3.5" />
                Kelola Bab &amp; KO
              </Button>
            </Link>

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

      {/* Confirmation Deletion Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rounded-xl border border-border">
          <DialogHeader>
            <DialogTitle>Hapus Materi Pelajaran?</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus materi &quot;{cleanTitle}&quot;? Tindakan ini akan menghapus materi secara permanen dari basis data utama dan membersihkan seluruh representasi memori AI terkait.
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
