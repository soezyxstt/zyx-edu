"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MarkdownRenderer } from "@/components/course/markdown-renderer";
import { cn } from "@/lib/utils";
import { MathText } from "@/components/course/math-text";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft,
  BookOpen,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Edit2,
  RefreshCw,
  Eye,
  Sliders,
  Info,
  X
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
import {
  triggerBulkChapterGenerationAction,
  updateKOAction,
  toggleChapterPublishAction,
  regenerateWebsiteMaterialAction,
  getChapterAssetGenProgressAction
} from "./actions";

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

interface Chapter {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  orderIndex: number;
  status: string;
  assetGenStatus?: string;
  assetGenFlashcardsTotal?: number;
  assetGenFlashcardsCurrent?: number;
  assetGenQuestionsTotal?: number;
  assetGenQuestionsCurrent?: number;
  assetGenError?: string | null;
}

interface KnowledgeObject {
  id: string;
  courseId: string;
  mtdId: string;
  chapterId: string;
  conceptId: string;
  learningOrder: number;
  title: string;
  conceptName: string;
  content: string;
  type: "definition" | "formula" | "example" | "misconception" | "exercise" | "summary" | "objective" | "concept_overview";
  difficulty: "easy" | "medium" | "hard";
  bloomLevel: "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";
  tags: unknown;
  importance: "high" | "medium" | "low";
  pineconeVectorId: string | null;
  status: string;
}

interface WebsiteMaterial {
  id: string;
  courseId: string;
  chapterId: string;
  sourceMtdId: string;
  sourceMtdVersion: number;
  isStale: boolean;
  generationHash: string;
  title: string;
  slug: string;
  canonicalMarkdown: string;
  structuredContent: unknown;
  contentVersion: number;
  status: string;
}

interface Props {
  instance: Instance;
  course: Course;
  chapters: Chapter[];
  knowledgeObjects: KnowledgeObject[];
  websiteMaterials: WebsiteMaterial[];
}

export function MaterialDetailClient({
  instance,
  course,
  chapters: initialChapters,
  knowledgeObjects: initialKOs,
  websiteMaterials: initialWebMaterials
}: Props) {
  const router = useRouter();
  const [chaptersList, setChaptersList] = useState<Chapter[]>(initialChapters);
  const [kos, setKOs] = useState<KnowledgeObject[]>(initialKOs);
  const [webMats, setWebMats] = useState<WebsiteMaterial[]>(initialWebMaterials);

  const [activeChapterId, setActiveChapterId] = useState<string | null>(
    initialChapters.length > 0 ? initialChapters[0].id : null
  );
  const [activeTab, setActiveTab] = useState<"mastery" | "formulas" | "glossary" | "graph" | "advanced">("mastery");
  const [expandedMUs, setExpandedMUs] = useState<Record<string, boolean>>({});

  // Selected state for drawers
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [isKODrawerOpen, setIsKODrawerOpen] = useState(false);
  const [editingKO, setEditingKO] = useState<KnowledgeObject | null>(null);

  // Progress monitoring state
  const [progressStates, setProgressStates] = useState<Record<string, any>>({});
  const intervalsRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Loading states
  const [loadingChapterId, setLoadingChapterId] = useState<string | null>(null);
  const [savingKOId, setSavingKOId] = useState<string | null>(null);
  const [showStaleDiff, setShowStaleDiff] = useState<string | null>(null); // Chapter ID to show Diff modal

  // Edit KO Form State
  const [koForm, setKOForm] = useState({
    title: "",
    conceptName: "",
    content: "",
    type: "definition" as any,
    difficulty: "medium" as any,
    bloomLevel: "understand" as any,
    importance: "medium" as any,
  });

  const cleanTitle = instance.title.replace(/^\[DRAF\]\s*/, "");

  // Find website material for a chapter
  const getWebMatForChapter = (chapterId: string) => {
    return webMats.find(wm => wm.chapterId === chapterId);
  };

  // Find KOs for a chapter
  const getKOsForChapter = (chapterId: string) => {
    return kos.filter(ko => ko.chapterId === chapterId && ko.status === "active");
  };

  const startPolling = (chapterId: string) => {
    if (intervalsRef.current[chapterId]) return;

    const interval = setInterval(async () => {
      try {
        const res = await getChapterAssetGenProgressAction(chapterId);
        if (res.success && res.progress) {
          const prog = res.progress;
          setProgressStates(prev => ({ ...prev, [chapterId]: prog }));
          
          if (prog.status === "completed" || prog.status === "failed") {
            clearInterval(interval);
            delete intervalsRef.current[chapterId];
            
            // Sync with local state list
            setChaptersList(prev =>
              prev.map(c =>
                c.id === chapterId
                  ? {
                      ...c,
                      assetGenStatus: prog.status,
                      assetGenFlashcardsTotal: prog.flashcardsTotal,
                      assetGenFlashcardsCurrent: prog.flashcardsCurrent,
                      assetGenQuestionsTotal: prog.questionsTotal,
                      assetGenQuestionsCurrent: prog.questionsCurrent,
                      assetGenError: prog.error,
                    }
                  : c
              )
            );

            if (prog.status === "completed") {
              toast.success("Pembuatan kuis, flashcards, dan penyelarasan materi telah selesai!");
              router.refresh();
            } else {
              toast.error(`Gagal membuat aset: ${prog.error || "Unknown error"}`);
            }
          }
        }
      } catch (err) {
        console.error("Error polling progress:", err);
      }
    }, 2000);

    intervalsRef.current[chapterId] = interval;
  };

  useEffect(() => {
    // Start polling for any chapter that is currently in "generating" status
    chaptersList.forEach(chapter => {
      if (chapter.assetGenStatus === "generating") {
        startPolling(chapter.id);
      }
    });

    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
    };
  }, []);

  const handleTriggerBulkGeneration = async (chapterId: string) => {
    setLoadingChapterId(chapterId + "-bulk");
    try {
      const res = await triggerBulkChapterGenerationAction(chapterId);
      if (res.success) {
        toast.success(
          "Proses pembuatan kuis, flashcards, dan penyelarasan materi telah berhasil dijadwalkan di latar belakang!"
        );
        // Instantly mark local state as generating
        setChaptersList(prev =>
          prev.map(c =>
            c.id === chapterId
              ? {
                  ...c,
                  assetGenStatus: "generating",
                  assetGenFlashcardsTotal: 0,
                  assetGenFlashcardsCurrent: 0,
                  assetGenQuestionsTotal: 0,
                  assetGenQuestionsCurrent: 0,
                  assetGenError: null,
                }
              : c
          )
        );
        // Start client-side polling immediately
        startPolling(chapterId);
      } else {
        toast.error(`Gagal memulai pembuatan aset: ${res.error}`);
      }
    } catch (e) {
      toast.error("Kesalahan jaringan.");
    } finally {
      setLoadingChapterId(null);
    }
  };

  const handleTogglePublish = async (chapterId: string, currentStatus: string) => {
    setLoadingChapterId(chapterId + "-publish");
    const nextPublish = currentStatus !== "published";
    try {
      const res = await toggleChapterPublishAction(chapterId, nextPublish);
      if (res.success) {
        toast.success(nextPublish ? "Bab telah dipublikasikan!" : "Bab dikembalikan ke Draf.");
        // Update local state
        setChaptersList(prev => prev.map(c => c.id === chapterId ? { ...c, status: nextPublish ? "published" : "draft" } : c));
        setWebMats(prev => prev.map(wm => wm.chapterId === chapterId ? { ...wm, status: nextPublish ? "published" : "draft" } : wm));
      } else {
        toast.error(`Gagal memperbarui status publikasi: ${res.error}`);
      }
    } catch (e) {
      toast.error("Kesalahan jaringan.");
    } finally {
      setLoadingChapterId(null);
    }
  };

  const handleSyncMaterial = async (chapterId: string) => {
    setLoadingChapterId(chapterId + "-sync");
    try {
      const res = await regenerateWebsiteMaterialAction(chapterId);
      if (res.success) {
        toast.success("Materi Website berhasil disinkronkan!");
        setWebMats(prev => prev.map(wm => wm.chapterId === chapterId ? { ...wm, isStale: false } : wm));
        setShowStaleDiff(null);
      } else {
        toast.error(`Gagal mensinkronkan materi: ${res.error}`);
      }
    } catch (e) {
      toast.error("Kesalahan jaringan.");
    } finally {
      setLoadingChapterId(null);
    }
  };

  const handleOpenKODrawer = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setIsKODrawerOpen(true);
  };

  const handleStartEditKO = (ko: KnowledgeObject) => {
    setEditingKO(ko);
    setKOForm({
      title: ko.title,
      conceptName: ko.conceptName,
      content: ko.content,
      type: ko.type,
      difficulty: ko.difficulty,
      bloomLevel: ko.bloomLevel,
      importance: ko.importance,
    });
  };

  const handleSaveKO = async () => {
    if (!editingKO) return;
    setSavingKOId(editingKO.id);
    try {
      const res = await updateKOAction(editingKO.id, koForm);
      if (res.success) {
        toast.success("Objek Pengetahuan berhasil diperbarui.");
        
        // Update local KO state
        setKOs(prev => prev.map(k => k.id === editingKO.id ? { ...k, ...koForm } : k));
        
        // Mark matching website material as stale in local state
        setWebMats(prev => prev.map(wm => wm.chapterId === editingKO.chapterId ? { ...wm, isStale: true } : wm));
        
        setEditingKO(null);
      } else {
        toast.error(`Gagal menyimpan Objek Pengetahuan: ${res.error}`);
      }
    } catch (e) {
      toast.error("Kesalahan jaringan.");
    } finally {
      setSavingKOId(null);
    }
  };

  const renderChapterWorkspace = (chapterId: string) => {
    const chapter = chaptersList.find(c => c.id === chapterId);
    if (!chapter) return null;

    const chapterKOs = getKOsForChapter(chapterId);
    const webMat = getWebMatForChapter(chapterId);
    const isStale = webMat?.isStale ?? false;
    const status = webMat?.status ?? "draft";

    // Group KOs into Mastery Units based on conceptName
    const concepts = chapterKOs.filter(ko => ko.type === "concept_overview" || ko.type === "definition");
    const formulas = chapterKOs.filter(ko => ko.type === "formula");
    const definitions = chapterKOs.filter(ko => ko.type === "definition");
    const misconceptions = chapterKOs.filter(ko => ko.type === "misconception");
    const examples = chapterKOs.filter(ko => ko.type === "example");
    const exercises = chapterKOs.filter(ko => ko.type === "exercise");
    
    const masteryUnits = concepts.map((concept, index) => {
      const supporting = chapterKOs.filter(ko => 
        ko.id !== concept.id && 
        ko.conceptName.toLowerCase().trim() === concept.conceptName.toLowerCase().trim()
      );
      
      const difficulty = concept.difficulty;
      const threshold = difficulty === "easy" ? 75 : difficulty === "medium" ? 70 : 60;
      
      return {
        id: concept.id || `mu-${index}`,
        concept,
        supporting,
        difficulty,
        threshold,
        importance: concept.importance || "medium"
      };
    });

    if (masteryUnits.length === 0 && chapterKOs.length > 0) {
      masteryUnits.push({
        id: "mu-fallback",
        concept: {
          id: "fallback-concept",
          conceptId: "ko-fallback-concept",
          title: "Konsep Utama Bab",
          conceptName: "Umum",
          content: "Penjelasan konsep umum bab ini.",
          type: "concept_overview",
          difficulty: "medium",
          bloomLevel: "understand",
          importance: "medium",
          courseId: chapter.courseId,
          mtdId: instance.id,
          chapterId: chapter.id,
          learningOrder: 1,
          tags: [],
          pineconeVectorId: null,
          status: "active"
        },
        supporting: chapterKOs,
        difficulty: "medium",
        threshold: 70,
        importance: "medium"
      });
    }

    const estimatedFlashcards = masteryUnits.length * 3;
    const estimatedQuestions = formulas.length * 2 || 6;

    return (
      <div className="space-y-6 text-left">
        {/* Chapter-level Recommendation Summary Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <span className="font-mono text-xs font-bold text-muted-foreground">BAB {chapter.orderIndex}</span>
              <h2 className="font-heading text-h5 font-bold text-foreground">
                {chapter.title}
              </h2>
              <p className="text-body-sm text-muted-foreground">
                Diagnosis pedagogis bab ini berdasarkan muatan objek pengetahuan yang terdaftar.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={status === "published" ? "outline" : "default"}
                size="sm"
                className="rounded-md text-xs font-semibold cursor-pointer"
                disabled={loadingChapterId === chapter.id + "-publish"}
                onClick={() => handleTogglePublish(chapter.id, status)}
              >
                {loadingChapterId === chapter.id + "-publish" && (
                  <Loader2 className="size-3 mr-1 animate-spin" />
                )}
                {status === "published" ? "Arsipkan Bab" : "Publikasikan Bab"}
              </Button>
            </div>
          </div>

          <div className="p-4 bg-muted/10 border border-border rounded-xl space-y-2">
            <div className="flex gap-2 text-foreground">
              <Info className="size-4 shrink-0 mt-0.5 text-primary" />
              <div>
                <h4 className="text-body-sm font-bold">Kesimpulan Rekomendasi Pedagogis</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Bab ini mengandung <span className="font-semibold text-foreground">{masteryUnits.length} Mastery Unit</span> ({masteryUnits.filter(m => m.difficulty === "easy").length} Fundamental, {masteryUnits.filter(m => m.difficulty === "medium").length} Intermediate, {masteryUnits.filter(m => m.difficulty === "hard").length} Advanced). 
                  Rata-rata domain kognitif berada pada tingkat <span className="font-semibold text-foreground">Apply &amp; Analyze</span>. 
                  {formulas.length > 0 ? ` Ditemukan ${formulas.length} rumus penting. ` : ""}
                  {exercises.length === 0 && formulas.length > 0 ? (
                    <span className="text-rose-600 font-semibold">Terdapat formula penting yang belum memiliki latihan pendukung. Rekomendasi: generate latihan kustom.</span>
                  ) : "Seluruh cakupan materi telah didukung oleh latihan yang memadai."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-4 bg-muted/20 border border-border rounded-lg space-y-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold">Beban Belajar Est.</span>
              <span className="text-body-lg font-bold text-foreground block">45 Menit</span>
              <span className="text-xs text-muted-foreground block">Rekomendasi durasi studi siswa untuk mencapai ketuntasan bab ini.</span>
            </div>
            <div className="p-4 bg-muted/20 border border-border rounded-lg space-y-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold">Kerapatan Prasyarat</span>
              <span className="text-body-lg font-bold text-amber-600 block flex items-center gap-1.5">
                Tinggi (High)
              </span>
              <span className="text-xs text-muted-foreground block">Memiliki dependensi konsep berantai yang kuat dengan bab lain.</span>
            </div>
            <div className="p-4 bg-muted/20 border border-border rounded-lg space-y-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold">Estimasi Total Aset</span>
              <span className="text-body-lg font-bold text-foreground block">
                {estimatedFlashcards} FC · {estimatedQuestions} Quiz
              </span>
              <span className="text-xs text-muted-foreground block">Rekomendasi jumlah materi latihan untuk verifikasi masteri.</span>
            </div>
          </div>
        </div>

        {/* Asset Generation Center Card */}
        {(() => {
          const currentProgress = progressStates[chapter.id] || {
            status: chapter.assetGenStatus || "idle",
            flashcardsTotal: chapter.assetGenFlashcardsTotal || 0,
            flashcardsCurrent: chapter.assetGenFlashcardsCurrent || 0,
            questionsTotal: chapter.assetGenQuestionsTotal || 0,
            questionsCurrent: chapter.assetGenQuestionsCurrent || 0,
            error: chapter.assetGenError || null
          };

          const totalItems = (currentProgress.flashcardsTotal || 0) + (currentProgress.questionsTotal || 0);
          const currentItems = (currentProgress.flashcardsCurrent || 0) + (currentProgress.questionsCurrent || 0);
          const percentage = totalItems > 0 ? Math.round((currentItems / totalItems) * 100) : 0;

          return (
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-0.5">
                  <h3 className="font-heading text-body-lg font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="size-5 text-primary" />
                    Asset Generation Center
                  </h3>
                  <p className="text-body-sm text-muted-foreground mt-0.5">
                    Hasilkan seluruh latihan kuis dan kartu memori untuk bab ini secara massal sesuai analisis kelayakan.
                  </p>
                </div>


              </div>

              {currentProgress.status === "generating" && (
                <div className="p-4 bg-muted/10 border border-border rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-foreground">
                      {currentProgress.flashcardsCurrent < currentProgress.flashcardsTotal || currentProgress.flashcardsTotal === 0 ? (
                        "Membuat Kartu Memori..."
                      ) : (
                        `Membuat Soal Kuis: ${currentProgress.questionsCurrent} / ${currentProgress.questionsTotal} KO`
                      )}
                    </span>
                    <span className="text-primary font-mono">{percentage}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-md h-2 overflow-hidden border border-border">
                    <div 
                      className="bg-primary h-full transition-all duration-500 rounded-md" 
                      style={{ width: `${percentage}%` }} 
                    />
                  </div>
                  <div className="flex gap-4 text-[11px] text-muted-foreground">
                    <div>
                      Kartu Memori: <span className="font-semibold text-foreground">{currentProgress.flashcardsCurrent} / {currentProgress.flashcardsTotal}</span>
                    </div>
                    <div>
                      Soal Kuis: <span className="font-semibold text-foreground">{currentProgress.questionsCurrent} / {currentProgress.questionsTotal}</span>
                    </div>
                  </div>
                </div>
              )}

              {currentProgress.status === "failed" && currentProgress.error && (
                <div className="p-3.5 bg-status-error/5 border border-status-error/20 rounded-lg text-xs text-status-error leading-relaxed font-mono">
                  Error: {currentProgress.error}
                </div>
              )}

              <div className="flex gap-3 flex-wrap">
                <Button
                  variant={currentProgress.status === "completed" ? "outline" : "default"}
                  className={cn(
                    "rounded-lg gap-2 font-semibold text-xs h-9 cursor-pointer",
                    currentProgress.status === "completed" ? "" : "text-white"
                  )}
                  disabled={currentProgress.status === "generating"}
                  onClick={() => handleTriggerBulkGeneration(chapter.id)}
                >
                  {currentProgress.status === "generating" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  {currentProgress.status === "completed"
                    ? "Generate Ulang Semua Aset"
                    : currentProgress.status === "generating"
                      ? "Memproses..."
                      : "Generate All Recommended Assets"}
                </Button>
              </div>
            </div>
          );
        })()}

        {/* Diff/Stale Warning box if stale */}
        {isStale && (
          <div className="p-4 rounded-lg bg-status-error/10 border border-status-error/20 text-left space-y-3">
            <div className="flex gap-2 text-status-error">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-body-sm font-bold">Aset Website Out-of-Sync</h4>
                <p className="text-xs text-status-error/90 mt-0.5 leading-relaxed">
                  Tutor melakukan perubahan pada Objek Pengetahuan (KO) di bab ini. Modul ajar siswa saat ini menggunakan data lama. Klik &quot;Bandingkan &amp; Sinkronkan&quot; untuk menyelaraskan.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="rounded-md text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
                onClick={() => setShowStaleDiff(chapter.id)}
              >
                Bandingkan &amp; Sinkronkan
              </Button>
            </div>
          </div>
        )}

        {/* Workspace Tab Bar */}
        <div className="border-b border-border">
          <div className="flex gap-2">
            {[
              { id: "mastery", label: "Mastery Units" },
              { id: "formulas", label: "Formulas" },
              { id: "glossary", label: "Glossary" },
              { id: "graph", label: "Knowledge Graph" },
              { id: "advanced", label: "Advanced" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-4 py-2 text-xs font-bold transition-all border-b-2 -mb-[2px] cursor-pointer",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Contents */}
        <div className="space-y-4">
          
          {/* TAB 1: MASTERY UNITS */}
          {activeTab === "mastery" && (
            <div className="space-y-4">
              {masteryUnits.map(mu => {
                const isExpanded = !!expandedMUs[mu.id];
                return (
                  <div key={mu.id} className="border border-border rounded-xl overflow-hidden bg-card shadow-xs">
                    <div 
                      className="px-5 py-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-muted/10 transition-colors"
                      onClick={() => setExpandedMUs(prev => ({ ...prev, [mu.id]: !prev[mu.id] }))}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-body-base font-bold text-foreground">{mu.concept.conceptName}</span>
                          <span className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase border",
                            mu.difficulty === "easy"
                              ? "bg-status-success/10 text-status-success border-status-success/20"
                              : mu.difficulty === "medium"
                                ? "bg-status-warning/10 text-status-warning border-status-warning/20"
                                : "bg-status-error/10 text-status-error border-status-error/20"
                          )}>
                            {mu.difficulty}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border uppercase">
                            Bloom: {mu.concept.bloomLevel}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {mu.supporting.length} Aset Pendukung (Formula/Miskonsepsi/Contoh) · Nilai Ambang Batas: <span className="font-semibold text-foreground">{mu.threshold}%</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="xs"
                          className="rounded-md font-semibold text-xs h-8 px-3 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedChapter(chapter);
                            handleStartEditKO(mu.concept);
                            setIsKODrawerOpen(true);
                          }}
                        >
                          Edit Konsep
                        </Button>
                        <span className="text-muted-foreground font-mono text-xs select-none">
                          {isExpanded ? "[Tutup]" : "[Buka]"}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-3 border-t border-border bg-muted/5 space-y-4">
                        <div className="space-y-1.5 p-4 bg-background border border-border rounded-lg">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-bold">Penjelasan Konsep</span>
                          <MathText className="text-body-sm text-foreground block leading-relaxed" as="div">
                            {mu.concept.content}
                          </MathText>
                        </div>

                        {mu.supporting.length > 0 ? (
                          <div className="space-y-3">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-bold">Aset Pendukung Mastery</span>
                            
                            <div className="grid gap-3">
                              {mu.supporting.map(ko => (
                                <div key={ko.id} className="p-3.5 bg-background border border-border rounded-lg space-y-2">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                      <span className="inline-block font-mono text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase border border-border font-bold">
                                        {ko.type}
                                      </span>
                                      <span className="text-body-xs font-bold text-foreground">{ko.title}</span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      className="rounded-md font-semibold text-[10px] h-6 px-2 cursor-pointer"
                                      onClick={() => {
                                        setSelectedChapter(chapter);
                                        handleStartEditKO(ko);
                                        setIsKODrawerOpen(true);
                                      }}
                                    >
                                      Edit KO
                                    </Button>
                                  </div>

                                  <div className="text-xs text-muted-foreground leading-relaxed pl-1.5 border-l border-border">
                                    <MathText as="div">{ko.content}</MathText>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Belum ada aset pendukung (seperti rumus atau latihan) yang dikaitkan dengan konsep ini.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: FORMULAS */}
          {activeTab === "formulas" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {formulas.length > 0 ? (
                formulas.map(ko => (
                  <div key={ko.id} className="bg-card border border-border rounded-xl p-5 space-y-3 shadow-xs">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold">{ko.conceptName}</span>
                        <h4 className="text-body-sm font-bold text-foreground mt-0.5">{ko.title}</h4>
                      </div>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="rounded-md font-semibold text-xs h-7 px-2 cursor-pointer"
                        onClick={() => {
                          setSelectedChapter(chapter);
                          handleStartEditKO(ko);
                          setIsKODrawerOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    </div>

                    <div className="p-3 bg-muted/10 border border-border/80 rounded-lg text-sm text-foreground overflow-x-auto">
                      <MathText as="div">{ko.content}</MathText>
                    </div>
                  </div>
                ))
              ) : (
                <div className="sm:col-span-2 py-8 text-center text-muted-foreground italic border border-dashed border-border rounded-xl bg-card">
                  Tidak ditemukan rumus matematika khusus dalam bab ini.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GLOSSARY */}
          {activeTab === "glossary" && (
            <div className="border border-border rounded-xl bg-card overflow-hidden shadow-xs">
              <table className="w-full border-collapse text-body-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-5 py-3 font-semibold text-foreground text-xs uppercase tracking-wider">Istilah / Term</th>
                    <th className="px-5 py-3 font-semibold text-foreground text-xs uppercase tracking-wider">Definisi & Penjelasan</th>
                    <th className="px-5 py-3 font-semibold text-foreground text-xs uppercase tracking-wider w-20 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {definitions.length > 0 ? (
                    definitions.map(ko => (
                      <tr key={ko.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-5 py-4 font-bold text-foreground align-top whitespace-nowrap">{ko.conceptName}</td>
                        <td className="px-5 py-4 text-muted-foreground leading-relaxed align-top">
                          <MathText as="div">{ko.content}</MathText>
                        </td>
                        <td className="px-5 py-4 align-top text-center whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="xs"
                            className="rounded-md font-semibold text-xs h-7 px-2 cursor-pointer"
                            onClick={() => {
                              setSelectedChapter(chapter);
                              handleStartEditKO(ko);
                              setIsKODrawerOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-5 py-8 text-center text-muted-foreground italic">
                        Tidak ada glosarium terdaftar di bab ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: KNOWLEDGE GRAPH */}
          {activeTab === "graph" && (
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
                <div>
                  <h3 className="font-heading text-body-sm font-bold text-foreground uppercase tracking-wider">Jalur Prasyarat & Alur Belajar</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Urutan logis penguasaan konsep yang terstruktur dalam graf pembelajaran.</p>
                </div>
                
                <div className="relative pl-6 space-y-5 border-l-2 border-border/80 ml-2 py-1">
                  {masteryUnits.map((mu, index) => (
                    <div key={mu.id} className="relative">
                      <div className="absolute -left-[30px] top-1.5 size-4 rounded-full border-2 border-primary bg-background flex items-center justify-center">
                        <div className="size-1.5 rounded-full bg-primary" />
                      </div>
                      <div className="space-y-1 bg-muted/10 border border-border/60 p-4 rounded-lg">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-muted-foreground">LANGKAH {index + 1}</span>
                          <span className="text-body-sm font-bold text-foreground">{mu.concept.conceptName}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {index < masteryUnits.length - 1 
                            ? `Prasyarat wajib sebelum mempelajari konsep "${masteryUnits[index + 1].concept.conceptName}"` 
                            : "Gerbang keluar bab (Selesai). Siap dievaluasi."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ADVANCED (ALL KOs) */}
          {activeTab === "advanced" && (
            <div className="border border-border rounded-xl bg-card overflow-hidden shadow-xs">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-4 py-3 font-semibold text-foreground text-[10px] uppercase tracking-wider">Judul KO</th>
                    <th className="px-4 py-3 font-semibold text-foreground text-[10px] uppercase tracking-wider">Nama Konsep</th>
                    <th className="px-4 py-3 font-semibold text-foreground text-[10px] uppercase tracking-wider w-24">Tipe</th>
                    <th className="px-4 py-3 font-semibold text-foreground text-[10px] uppercase tracking-wider w-20">Kesulitan</th>
                    <th className="px-4 py-3 font-semibold text-foreground text-[10px] uppercase tracking-wider w-24">Bloom</th>
                    <th className="px-4 py-3 font-semibold text-foreground text-[10px] uppercase tracking-wider w-20">Penting</th>
                    <th className="px-4 py-3 font-semibold text-foreground text-[10px] uppercase tracking-wider w-20 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {chapterKOs.map(ko => (
                    <tr key={ko.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground truncate max-w-[200px]" title={ko.title}>{ko.title}</td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[150px]" title={ko.conceptName}>{ko.conceptName}</td>
                      <td className="px-4 py-3 align-middle font-mono text-[10px] text-muted-foreground uppercase">{ko.type}</td>
                      <td className="px-4 py-3 align-middle">
                        <span className={cn(
                          "inline-block font-mono text-[9px] px-1.5 py-0.5 rounded border uppercase",
                          ko.difficulty === "easy"
                            ? "bg-status-success/10 text-status-success border-status-success/20"
                            : ko.difficulty === "medium"
                              ? "bg-status-warning/10 text-status-warning border-status-warning/20"
                              : "bg-status-error/10 text-status-error border-status-error/20"
                        )}>
                          {ko.difficulty}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle text-muted-foreground capitalize font-mono text-[10px]">{ko.bloomLevel}</td>
                      <td className="px-4 py-3 align-middle text-muted-foreground capitalize font-mono text-[10px]">{ko.importance}</td>
                      <td className="px-4 py-3 align-middle text-center">
                        <Button
                          variant="ghost"
                          size="xs"
                          className="rounded-md font-semibold text-[10px] h-7 px-2 cursor-pointer"
                          onClick={() => {
                            setSelectedChapter(chapter);
                            handleStartEditKO(ko);
                            setIsKODrawerOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header breadcrumb & info bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1 text-left">
          <Link
            href="/admin/ai/materials"
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Kembali ke Materi
          </Link>
          <h1 className="font-heading text-h4 font-bold text-foreground">
            {activeChapterId 
              ? `${chaptersList.find(c => c.id === activeChapterId)?.title || "Workspace Bab"}`
              : cleanTitle}
          </h1>
          <p className="text-body-sm text-muted-foreground">
            Materi Kelas: <span className="font-semibold text-foreground">{course.title}</span> · Sumber: <span className="font-mono text-xs uppercase px-1.5 py-0.5 bg-muted rounded-md border border-border">{instance.sourceType}</span>
          </p>
        </div>
      </div>

      {activeChapterId ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left/Center: Chapter Workspace */}
          <div className="lg:col-span-2 space-y-6">
            {renderChapterWorkspace(activeChapterId)}
          </div>

          {/* Right Side: Info Panel */}
          <div className="space-y-6">
            {/* Info Dokumen Utama */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-xs text-left space-y-4">
              <h3 className="font-heading text-body-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
                <BookOpen className="size-5 text-primary" />
                Info Dokumen Utama
              </h3>
              
              <div className="space-y-3 text-body-sm">
                <div>
                  <span className="text-muted-foreground block text-xs uppercase tracking-wider">Judul Materi</span>
                  <span className="font-semibold text-foreground mt-0.5 block">{cleanTitle}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs uppercase tracking-wider">Kursus</span>
                  <span className="font-semibold text-foreground mt-0.5 block">{course.title}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs uppercase tracking-wider">Sinkronisasi Vektor</span>
                  <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-semibold mt-1 border uppercase ${
                    instance.pineconeSyncStatus === "synced" 
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                      : instance.pineconeSyncStatus === "pending"
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        : "bg-destructive/10 text-destructive border-destructive/20"
                  }`}>
                    {instance.pineconeSyncStatus}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs uppercase tracking-wider">Ringkasan</span>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{instance.summary}</p>
                </div>
              </div>
            </div>

            {/* Alur Kerja Tutor Zyx */}
            <div className="p-4 bg-muted/20 border border-border rounded-xl text-left space-y-3">
              <div className="flex gap-2 text-muted-foreground">
                <Info className="size-4 shrink-0 mt-0.5 text-primary" />
                <div>
                  <h4 className="text-xs font-bold text-foreground">Alur Kerja Tutor Zyx</h4>
                  <p className="text-[11px] leading-relaxed mt-1">
                    1. Perbaiki kesalahan pengetikan atau visualisasi rumus LaTeX langsung di Inspeksi KO.<br />
                    2. Mengubah KO secara otomatis memicu tanda stale pada Website Material agar tidak terjadi inkonsistensi.<br />
                    3. Setelah memverifikasi keselarasan materi, lakukan &quot;Sinkronkan&quot; untuk me-resolve status stale.<br />
                    4. Buat Flashcard dan Soal Kuis untuk siswa setelah materi dirasa matang.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground italic border border-dashed border-border rounded-xl bg-card">
          Materi ini belum terdekomposisi menjadi bab. Silakan unggah dokumen yang valid.
        </div>
      )}

      {/* DIALOG: COMPARE & SYNC STALE MATERIAL */}
      {showStaleDiff && (() => {
        const chapter = chaptersList.find(c => c.id === showStaleDiff);
        const webMat = getWebMatForChapter(showStaleDiff);
        if (!chapter || !webMat) return null;
        
        return (
          <Dialog open={!!showStaleDiff} onOpenChange={() => setShowStaleDiff(null)}>
            <DialogContent className="rounded-xl max-w-2xl border border-border">
              <DialogHeader>
                <DialogTitle className="font-heading text-h6 font-semibold flex items-center gap-2 text-rose-600">
                  <AlertTriangle className="size-5" />
                  Penyelarasan Materi Bab: {chapter.title}
                </DialogTitle>
                <DialogDescription className="text-body-sm leading-relaxed mt-1">
                  Perubahan Objek Pengetahuan (KO) telah terdeteksi. Silakan verifikasi dan sinkronkan agar website material siswa mencerminkan revisi terbaru.
                </DialogDescription>
              </DialogHeader>

              <div className="my-4 space-y-3 text-left">
                <div className="bg-muted p-4 rounded-lg border border-border space-y-2">
                  <span className="font-semibold text-xs text-muted-foreground uppercase block">Daftar KO yang Berubah</span>
                  <ul className="text-xs list-disc list-inside space-y-1 text-foreground">
                    {getKOsForChapter(chapter.id).map(ko => (
                      <li key={ko.id}>
                        <span className="font-semibold">{ko.title}</span> ({ko.type})
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Menyetujui penyelarasan ini akan memperbarui hash keandalan pembelajaran, membersihkan tanda <strong>stale</strong>, dan memastikan Zyra merujuk pada versi KO ini untuk mendampingi siswa.
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  className="rounded-lg"
                  onClick={() => setShowStaleDiff(null)}
                  disabled={loadingChapterId === chapter.id + "-sync"}
                >
                  Batal
                </Button>
                <Button
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  disabled={loadingChapterId === chapter.id + "-sync"}
                  onClick={() => handleSyncMaterial(chapter.id)}
                >
                  {loadingChapterId === chapter.id + "-sync" ? (
                    <>
                      <Loader2 className="size-4 mr-1.5 animate-spin" />
                      Mensinkronkan...
                    </>
                  ) : (
                    "Sinkronkan Aset Sekarang"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* DIALOG: ADVANCED KNOWLEDGE OBJECT INSPECTOR DRAWER */}
      {isKODrawerOpen && selectedChapter && (
        <Dialog open={isKODrawerOpen} onOpenChange={setIsKODrawerOpen}>
          <DialogContent className="rounded-xl max-w-4xl max-h-[90vh] overflow-y-auto border border-border">
            <DialogHeader className="border-b border-border pb-4">
              <DialogTitle className="font-heading text-h6 font-semibold flex items-center gap-2">
                <Layers className="size-5 text-primary" />
                Kurator Objek Pengetahuan - Bab {selectedChapter.orderIndex}
              </DialogTitle>
              <DialogDescription className="text-body-sm leading-relaxed mt-1 text-left">
                Detail pemetaan Objek Pengetahuan (KO) untuk bab <strong>{selectedChapter.title}</strong>. Edit definisi atau perbaiki representasi rumus LaTeX di bawah ini.
              </DialogDescription>
            </DialogHeader>

            <div className="my-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              {/* Left Column: KO List */}
              <div className="space-y-3 border-r border-border pr-6 max-h-[500px] overflow-y-auto">
                <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wider block mb-1">
                  Daftar Objek Pengetahuan ({getKOsForChapter(selectedChapter.id).length})
                </span>
                
                {getKOsForChapter(selectedChapter.id).map(ko => (
                  <div 
                    key={ko.id}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      editingKO?.id === ko.id 
                        ? "bg-primary/5 border-primary shadow-xs" 
                        : "border-border hover:bg-muted/50"
                    }`}
                    onClick={() => handleStartEditKO(ko)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-body-sm font-bold text-foreground line-clamp-1">{ko.title}</h4>
                        <span className="inline-block mt-1 font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground uppercase border border-border">
                          {ko.type}
                        </span>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase border ${
                        ko.difficulty === "easy"
                          ? "bg-status-success/10 text-status-success border-status-success/20"
                          : ko.difficulty === "medium"
                            ? "bg-status-warning/10 text-status-warning border-status-warning/20"
                            : "bg-status-error/10 text-status-error border-status-error/20"
                      }`}>
                        {ko.difficulty}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Column: KO Edit Form */}
              <div className="space-y-4">
                {editingKO ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                        Editor Objek Pengetahuan
                      </span>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="rounded-md size-6 p-0"
                        onClick={() => setEditingKO(null)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase">Nama Konsep</label>
                        <input
                          type="text"
                          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-body-sm text-foreground shadow-xs focus:border-primary focus:ring-1 focus:ring-primary"
                          value={koForm.conceptName}
                          onChange={e => setKOForm(prev => ({ ...prev, conceptName: e.target.value }))}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase">Judul Objek</label>
                        <input
                          type="text"
                          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-body-sm text-foreground shadow-xs focus:border-primary focus:ring-1 focus:ring-primary"
                          value={koForm.title}
                          onChange={e => setKOForm(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground uppercase">Kategori</label>
                          <select
                            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-body-sm text-foreground shadow-xs focus:border-primary focus:ring-1 focus:ring-primary"
                            value={koForm.type}
                            onChange={e => setKOForm(prev => ({ ...prev, type: e.target.value as any }))}
                          >
                            <option value="definition">definition</option>
                            <option value="formula">formula</option>
                            <option value="example">example</option>
                            <option value="misconception">misconception</option>
                            <option value="exercise">exercise</option>
                            <option value="summary">summary</option>
                            <option value="objective">objective</option>
                            <option value="concept_overview">concept_overview</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground uppercase">Kesulitan</label>
                          <select
                            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-body-sm text-foreground shadow-xs focus:border-primary focus:ring-1 focus:ring-primary"
                            value={koForm.difficulty}
                            onChange={e => setKOForm(prev => ({ ...prev, difficulty: e.target.value as any }))}
                          >
                            <option value="easy">easy</option>
                            <option value="medium">medium</option>
                            <option value="hard">hard</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground uppercase">Taksonomi Bloom</label>
                          <select
                            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-body-sm text-foreground shadow-xs focus:border-primary focus:ring-1 focus:ring-primary"
                            value={koForm.bloomLevel}
                            onChange={e => setKOForm(prev => ({ ...prev, bloomLevel: e.target.value as any }))}
                          >
                            <option value="remember">remember</option>
                            <option value="understand">understand</option>
                            <option value="apply">apply</option>
                            <option value="analyze">analyze</option>
                            <option value="evaluate">evaluate</option>
                            <option value="create">create</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground uppercase">Tingkat Penting</label>
                          <select
                            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-body-sm text-foreground shadow-xs focus:border-primary focus:ring-1 focus:ring-primary"
                            value={koForm.importance}
                            onChange={e => setKOForm(prev => ({ ...prev, importance: e.target.value as any }))}
                          >
                            <option value="high">high</option>
                            <option value="medium">medium</option>
                            <option value="low">low</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase">Konten Penjelasan (Markdown / LaTeX)</label>
                        <textarea
                          rows={6}
                          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 font-mono text-xs text-foreground shadow-xs focus:border-primary focus:ring-1 focus:ring-primary"
                          value={koForm.content}
                          onChange={e => setKOForm(prev => ({ ...prev, content: e.target.value }))}
                        />
                      </div>

                      <Button
                        className="w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                        disabled={savingKOId === editingKO.id}
                        onClick={handleSaveKO}
                      >
                        {savingKOId === editingKO.id ? (
                          <>
                            <Loader2 className="size-4 mr-1.5 animate-spin" />
                            Menyimpan...
                          </>
                        ) : (
                          "Simpan Perubahan KO"
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-lg text-muted-foreground bg-muted/5">
                    <Info className="size-8 text-muted-foreground/60 mb-2" />
                    <p className="text-body-sm font-semibold">Pilih Objek Pengetahuan</p>
                    <p className="text-xs mt-0.5">Pilih salah satu KO di panel kiri untuk melihat detail atau melakukan perubahan.</p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="border-t border-border pt-4">
              <Button
                type="button"
                className="rounded-lg"
                onClick={() => setIsKODrawerOpen(false)}
              >
                Selesai
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
