"use client";

import * as React from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  BookOpen, 
  Layers, 
  ClipboardList, 
  HelpCircle, 
  Compass, 
  AlertTriangle, 
  Loader2, 
  Check, 
  X, 
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { 
  explainConceptAction, 
  analyzeMistakeAction, 
  buildStudyPlanAction, 
  generatePracticeQuizAction, 
  startFlashcardReviewAction, 
  openMaterialAction 
} from "@/app/actions/tutor";
import { MarkdownRenderer } from "@/components/course/markdown-renderer";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Fetch extra actions from custom action file
import { getFlashcardsForKOAction } from "@/app/actions/tutor-extra";

type TutorMode = "explain" | "mistake" | "study-plan" | null;
type ActiveAction = "none" | "flashcards" | "practice-quiz";

interface TutorContextType {
  openExplain: (koId: string, initialMode?: "content" | "analogy" | "simplification") => void;
  openMistake: (questionId: string, userAnswer: string) => void;
  openStudyPlan: () => void;
  close: () => void;
  isOpen: boolean;
  activeMode: TutorMode;
}

const TutorContext = React.createContext<TutorContextType | undefined>(undefined);

export function useTutor() {
  const context = React.useContext(TutorContext);
  if (!context) {
    throw new Error("useTutor must be used within a TutorProvider");
  }
  return context;
}

export function TutorProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeMode, setActiveMode] = React.useState<TutorMode>(null);
  
  // States to hold variables and results
  const [koId, setKoId] = React.useState<string | null>(null);
  const [questionId, setQuestionId] = React.useState<string | null>(null);
  const [userAnswer, setUserAnswer] = React.useState<string | null>(null);
  const [explainMode, setExplainMode] = React.useState<"content" | "analogy" | "simplification">("content");
  
  // Loader and response data states
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [data, setData] = React.useState<any>(null);

  // Active micro-app widget inside drawer (e.g. Flashcards or Quiz)
  const [activeAction, setActiveAction] = React.useState<ActiveAction>("none");
  const [actionData, setActionData] = React.useState<any[]>([]);
  const [actionIndex, setActionIndex] = React.useState(0);
  const [actionFlipped, setActionFlipped] = React.useState(false);
  const [actionSelectedAnswer, setActionSelectedAnswer] = React.useState<number | null>(null);
  const [actionQuizSubmitted, setActionQuizSubmitted] = React.useState(false);

  const openExplain = React.useCallback((id: string, initialMode: "content" | "analogy" | "simplification" = "content") => {
    setKoId(id);
    setQuestionId(null);
    setUserAnswer(null);
    setExplainMode(initialMode);
    setActiveMode("explain");
    setActiveAction("none");
    setIsOpen(true);
  }, []);

  const openMistake = React.useCallback((qId: string, answerText: string) => {
    setKoId(null);
    setQuestionId(qId);
    setUserAnswer(answerText);
    setActiveMode("mistake");
    setActiveAction("none");
    setIsOpen(true);
  }, []);

  const openStudyPlan = React.useCallback(() => {
    setKoId(null);
    setQuestionId(null);
    setUserAnswer(null);
    setActiveMode("study-plan");
    setActiveAction("none");
    setIsOpen(true);
  }, []);

  const close = React.useCallback(() => {
    setIsOpen(false);
    setActiveMode(null);
    setData(null);
    setErrors([]);
  }, []);

  // Sync execution from backend services on mode triggers
  React.useEffect(() => {
    if (!isOpen || !activeMode) return;

    async function loadData() {
      setLoading(true);
      setErrors([]);
      setData(null);
      try {
        if (activeMode === "explain" && koId) {
          const res = await explainConceptAction(koId, explainMode);
          if (res.success) {
            setData(res.data);
          } else {
            setErrors(res.errors);
          }
        } else if (activeMode === "mistake" && questionId && userAnswer) {
          const res = await analyzeMistakeAction(questionId, userAnswer);
          if (res.success) {
            setData(res.data);
          } else {
            setErrors(res.errors);
          }
        } else if (activeMode === "study-plan") {
          const res = await buildStudyPlanAction();
          setData(res.plan);
        }
      } catch (err: any) {
        setErrors([err?.message || "Terjadi kesalahan internal. Silakan coba lagi."]);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isOpen, activeMode, koId, questionId, userAnswer, explainMode]);

  // Flashcards launcher inside drawer
  const handleLaunchFlashcards = async (targetKoId: string) => {
    setLoading(true);
    try {
      const cards = await getFlashcardsForKOAction(targetKoId);
      if (cards.length > 0) {
        setActionData(cards);
        setActionIndex(0);
        setActionFlipped(false);
        setActiveAction("flashcards");
        toast.success(`Memuat ${cards.length} kartu hafalan!`);
      } else {
        toast.info("Tidak ada kartu hafalan terpasang untuk konsep ini.");
      }
    } catch (e) {
      toast.error("Gagal memuat kartu hafalan.");
    } finally {
      setLoading(false);
    }
  };

  // Practice Quiz launcher inside drawer
  const handleLaunchPracticeQuiz = async (targetKoId: string) => {
    setLoading(false);
    // Render a lightweight 3-question practice set based on the active KO
    // We can fetch questions for this KO directly or simulate a lightweight quiz builder
    setLoading(true);
    try {
      const res = await generatePracticeQuizAction(targetKoId, "medium");
      // Query questions in question bank for this KO
      const { getQuestionsForKOAction } = await import("@/app/actions/tutor-extra");
      const questions = await getQuestionsForKOAction(targetKoId);
      if (questions.length > 0) {
        setActionData(questions.slice(0, 3));
        setActionIndex(0);
        setActionSelectedAnswer(null);
        setActionQuizSubmitted(false);
        setActiveAction("practice-quiz");
        toast.success("Latihan kuis cepat siap dimulai!");
      } else {
        toast.info("Gagal menemukan latihan kuis. Silakan coba beberapa saat lagi.");
      }
    } catch (e) {
      toast.error("Gagal membuat sesi latihan kuis.");
    } finally {
      setLoading(false);
    }
  };

  // Syllabus Materials redirect Action
  const handleOpenMaterial = async (chapterId: string, sectionId: string) => {
    try {
      const res = await openMaterialAction(chapterId, sectionId);
      if (res?.redirectUrl) {
        window.location.href = res.redirectUrl;
      }
    } catch (e) {
      toast.error("Gagal membuka halaman buku teks.");
    }
  };

  return (
    <TutorContext.Provider value={{ openExplain, openMistake, openStudyPlan, close, isOpen, activeMode }}>
      {children}
      
      <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
        <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col h-full bg-background border-l border-border">
          
          {/* Header Panel */}
          <SheetHeader className="p-5 border-b border-border/80 flex flex-row items-center gap-3 bg-muted/20">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <Sparkles className="size-5 animate-pulse" />
            </div>
            <div className="space-y-0.5 text-left">
              <SheetTitle className="font-heading text-body-base font-bold text-foreground">
                {activeMode === "explain" && "Penjelasan Konsep"}
                {activeMode === "mistake" && "Analisis Kesalahan Kuis"}
                {activeMode === "study-plan" && "Rencana Studi Mandiri"}
              </SheetTitle>
              <SheetDescription className="text-body-xs text-muted-foreground">
                ZYX Socratic AI Tutor · Asisten Belajar Personal
              </SheetDescription>
            </div>
          </SheetHeader>

          {/* Body Content Desk */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            
            {/* Loading Indicator */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <Loader2 className="size-8 text-brand-primary animate-spin" />
                <p className="text-body-xs font-semibold text-muted-foreground">Tutor sedang merangkum jawaban...</p>
              </div>
            )}

            {/* Error Quota display */}
            {!loading && errors.length > 0 && (
              <div className="rounded-2xl border border-rose-200/60 bg-rose-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-rose-600 font-semibold text-body-sm">
                  <AlertTriangle className="size-4 shrink-0" />
                  Batas Penggunaan AI Terlampaui
                </div>
                <p className="text-body-xs text-rose-950/80 leading-relaxed">
                  {errors[0].includes("DAILY_QUOTA_EXCEEDED") 
                    ? "Kuota harian gratis untuk asisten AI Anda telah habis hari ini (Maksimal 30 permintaan harian)."
                    : errors[0]}
                </p>
                <div className="border-t border-rose-200/30 pt-3 text-[11px] text-rose-800 font-mono">
                  <b>Pilihan Belajar Mandiri (Offline Mode):</b>
                  <ul className="mt-1.5 list-disc list-inside space-y-1">
                    <li>Gunakan menu buku teks / PDF secara mandiri.</li>
                    <li>Selesaikan kartu hafalan flashcards di deck utama.</li>
                    <li>Diskusi langsung bersama tutor ITB via whatsapp group.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Main view routing */}
            {!loading && errors.length === 0 && data && (
              <>
                {/* 1. EXPLAIN MODE */}
                {activeMode === "explain" && activeAction === "none" && (
                  <div className="space-y-4">
                    
                    {explainMode === "content" ? (
                      /* A. Direct DB content render */
                      <div className="space-y-4 font-sans leading-relaxed">
                        <div className="rounded-xl bg-muted/40 border border-border p-4">
                          <span className="inline-flex rounded bg-brand-primary/10 text-brand-primary px-2 py-0.5 text-body-xs font-bold uppercase tracking-wider">
                            {data.type || "Definisi"}
                          </span>
                          <h3 className="mt-2 font-heading text-body-lg font-bold text-foreground">
                            {data.title}
                          </h3>
                        </div>

                        <div className="text-body-sm text-foreground bg-card p-4 rounded-xl border border-border/80 shadow-2xs">
                          <MarkdownRenderer content={data.content} />
                        </div>

                        {/* Mode switches */}
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            className="rounded-lg h-9 text-body-xs"
                            onClick={() => setExplainMode("analogy")}
                          >
                            <Compass className="size-3.5 mr-1" />
                            Gunakan Analogi
                          </Button>
                          <Button 
                            variant="outline" 
                            className="rounded-lg h-9 text-body-xs"
                            onClick={() => setExplainMode("simplification")}
                          >
                            <RefreshCw className="size-3.5 mr-1" />
                            Sederhanakan
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* B. AI Explanation details (Analogy / Simplification) */
                      <div className="space-y-4">
                        <div className="flex items-center gap-1.5">
                          <Button 
                            variant="link" 
                            className="p-0 text-brand-primary text-body-xs font-bold"
                            onClick={() => setExplainMode("content")}
                          >
                            ← Kembali ke definisi
                          </Button>
                        </div>

                        {explainMode === "analogy" && (
                          <div className="rounded-xl border border-amber-200/60 bg-amber-500/5 p-4 space-y-2">
                            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Analogi Pendekatan</span>
                            <p className="text-body-sm text-amber-950 font-medium leading-relaxed italic">
                              &ldquo;{data.analogy}&rdquo;
                            </p>
                          </div>
                        )}

                        {explainMode === "simplification" && (
                          <div className="rounded-xl border border-sky-200/60 bg-sky-500/5 p-4 space-y-2">
                            <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">Penjelasan Sederhana</span>
                            <p className="text-body-sm text-sky-950 leading-relaxed font-sans">
                              {data.simplification}
                            </p>
                          </div>
                        )}

                        <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
                            <AlertTriangle className="size-3.5 text-brand-secondary" />
                            Kesalahan Klasik / Miskonsepsi
                          </span>
                          <p className="text-body-sm text-foreground leading-relaxed">
                            {data.commonMisconception}
                          </p>
                        </div>

                        {/* Socratic Reflection Section */}
                        <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 text-body-xs space-y-2 leading-relaxed">
                          <span className="font-bold text-brand-primary block">Refleksi Mandiri (Socratic):</span>
                          <p>
                            Bagaimana parameter fisis di atas mempengaruhi nilai akhir jika salah satu variabel diperkecil? Coba pikirkan hubungannya sebelum memulai latihan kuis.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Footer Recovery Action Triggers */}
                    <div className="border-t border-border pt-4 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">Dukungan Latihan Pembelajaran:</span>
                      
                      <div className="flex flex-col gap-2">
                        <Button 
                          className="w-full rounded-lg bg-brand-primary hover:bg-brand-primary/95 text-white"
                          onClick={() => handleLaunchFlashcards(koId!)}
                        >
                          <Layers className="size-4 mr-2" />
                          Latihan Kartu Hafalan (Flashcard)
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full rounded-lg"
                          onClick={() => handleLaunchPracticeQuiz(koId!)}
                        >
                          <ClipboardList className="size-4 mr-2 text-brand-secondary" />
                          Coba Latihan Kuis Cepat (3 Soal)
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="w-full rounded-lg text-muted-foreground hover:text-foreground text-body-xs"
                          onClick={() => handleOpenMaterial("limit", "1")} // redirects to chapter limit
                        >
                          <BookOpen className="size-4 mr-2" />
                          Buka Halaman Buku Teks
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. MISTAKE REVIEW MODE */}
                {activeMode === "mistake" && activeAction === "none" && (
                  <div className="space-y-4 font-sans leading-relaxed">
                    
                    <div className="rounded-xl bg-rose-500/5 border border-rose-200/50 p-4 space-y-1">
                      <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Temuan Miskonsepsi Utama:</span>
                      <p className="text-body-sm text-foreground leading-relaxed font-semibold">
                        {data.detectedMisconception}
                      </p>
                    </div>

                    <div className="rounded-xl bg-muted/40 border border-border p-4 space-y-1 text-body-sm">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Kesalahan Perhitungan / Substitusi:</span>
                      <p className="leading-relaxed">
                        {data.mathematicalError}
                      </p>
                    </div>

                    {/* guided Socratic reflection */}
                    <div className="rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-4 space-y-2">
                      <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider block flex items-center gap-1">
                        <HelpCircle className="size-3.5" />
                        Panduan Berpikir (Socratic):
                      </span>
                      <div className="text-body-sm text-foreground leading-relaxed font-medium space-y-2 italic">
                        <MarkdownRenderer content={data.socraticGuidance} />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="border-t border-border pt-4 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">Rekomendasi Pemulihan:</span>
                      <Button 
                        className="w-full rounded-lg bg-brand-primary hover:bg-brand-primary/95 text-white"
                        onClick={() => {
                          // Try to guess or fetch mapped KO. In this mock scenario we fallback to a standard KO reference.
                          openExplain("ko-101", "content");
                        }}
                      >
                        <Sparkles className="size-4 mr-2" />
                        Tinjau Ulang Konsep Terkait
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full rounded-lg"
                        onClick={() => handleLaunchFlashcards("ko-101")}
                      >
                        <Layers className="size-4 mr-2 text-brand-secondary" />
                        Jalankan Flashcard Penguatan
                      </Button>
                    </div>
                  </div>
                )}

                {/* 3. STUDY PLAN ROADMAP MODE */}
                {activeMode === "study-plan" && (
                  <div className="space-y-4">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Roadmap Pembelajaran Personal</span>
                    
                    <div className="space-y-3">
                      {data.map((step: string, index: number) => {
                        const isRemediation = step.includes("Remediation");
                        const isCurriculum = step.includes("Curriculum");
                        const isConcept = step.startsWith("Review Concept") || step.includes("Target:");
                        
                        if (isRemediation || isCurriculum) {
                          return (
                            <h4 key={index} className="pt-2 font-heading text-body-xs font-bold text-foreground border-b border-border pb-1">
                              {step.replace(/---/g, "")}
                            </h4>
                          );
                        }

                        return (
                          <div 
                            key={index} 
                            className={cn(
                              "p-3 rounded-xl border text-body-xs flex flex-col gap-2 transition-all hover:bg-muted/30",
                              isConcept ? "bg-card border-border/80" : "bg-muted/15 border-transparent text-muted-foreground pl-6"
                            )}
                          >
                            <p className="font-medium text-foreground">{step}</p>
                            {isConcept && (
                              <div className="flex gap-1.5 mt-1">
                                <Button 
                                  size="xs" 
                                  variant="outline" 
                                  className="h-7 text-[10px]"
                                  onClick={() => handleOpenMaterial("limit", "1")}
                                >
                                  Materi
                                </Button>
                                <Button 
                                  size="xs" 
                                  variant="ghost" 
                                  className="h-7 text-[10px] text-brand-primary hover:bg-brand-primary/5"
                                  onClick={() => handleLaunchFlashcards("ko-101")}
                                >
                                  Hafalan
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Micro-App Widget View overlay inside Drawer */}
                {activeAction === "flashcards" && actionData.length > 0 && (
                  <div className="absolute inset-0 bg-background z-30 p-5 flex flex-col justify-between">
                    <div className="space-y-4 flex-1 flex flex-col justify-start">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-brand-primary uppercase">Flashcards Hafalan ({actionIndex + 1}/{actionData.length})</span>
                        <Button 
                          variant="ghost" 
                          size="xs"
                          className="h-7 text-body-2xs"
                          onClick={() => setActiveAction("none")}
                        >
                          Tutup Latihan
                        </Button>
                      </div>

                      {/* Flip card box */}
                      <div 
                        onClick={() => setActionFlipped(!actionFlipped)}
                        className={cn(
                          "flex-1 min-h-[220px] max-h-[300px] border rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 shadow-md",
                          actionFlipped 
                            ? "bg-brand-primary/5 border-brand-primary/40 ring-1 ring-brand-primary/10" 
                            : "bg-card border-border hover:border-brand-primary/30"
                        )}
                      >
                        <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest block mb-4 select-none">
                          {actionFlipped ? "KUNCI JAWABAN (BELAKANG)" : "PERTANYAAN (DEPAN)"}
                        </span>
                        
                        <div className="text-body-base font-medium leading-relaxed font-sans max-w-xs text-foreground">
                          <MarkdownRenderer content={actionFlipped ? actionData[actionIndex].back : actionData[actionIndex].front} />
                        </div>

                        <span className="text-[9px] text-muted-foreground/60 select-none mt-8 italic">Klik kartu untuk membalikkan</span>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-border">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1 rounded-lg"
                          onClick={() => {
                            setActionFlipped(false);
                            if (actionIndex < actionData.length - 1) {
                              setActionIndex(actionIndex + 1);
                            } else {
                              toast.success("Kartu hafalan selesai dikerjakan!");
                              setActiveAction("none");
                            }
                          }}
                        >
                          Lupa / Salah
                        </Button>
                        <Button 
                          className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                          onClick={() => {
                            setActionFlipped(false);
                            if (actionIndex < actionData.length - 1) {
                              setActionIndex(actionIndex + 1);
                            } else {
                              toast.success("Hebat! Kartu hafalan selesai dikerjakan!");
                              setActiveAction("none");
                            }
                          }}
                        >
                          Ingat / Benar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {activeAction === "practice-quiz" && actionData.length > 0 && (
                  <div className="absolute inset-0 bg-background z-30 p-5 flex flex-col justify-between">
                    <div className="space-y-4 flex-1 flex flex-col justify-start">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-brand-secondary uppercase">LATIHAN KUIS ({actionIndex + 1}/{actionData.length})</span>
                        <Button 
                          variant="ghost" 
                          size="xs"
                          className="h-7 text-body-2xs"
                          onClick={() => setActiveAction("none")}
                        >
                          Batal
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div className="font-heading text-body-sm font-semibold text-foreground">
                          <MarkdownRenderer content={actionData[actionIndex].prompt} />
                        </div>

                        {/* Options buttons */}
                        <ul className="space-y-2 pt-2">
                          {(actionData[actionIndex].options as string[]).map((opt, oIdx) => {
                            const isSelected = actionSelectedAnswer === oIdx;
                            const isCorrect = (actionData[actionIndex].correctIndices as number[]).includes(oIdx);
                            
                            return (
                              <li key={oIdx}>
                                <button
                                  type="button"
                                  disabled={actionQuizSubmitted}
                                  onClick={() => setActionSelectedAnswer(oIdx)}
                                  className={cn(
                                    "flex w-full items-center gap-2 rounded-lg border p-3 text-left text-body-xs font-medium transition-colors cursor-pointer",
                                    actionQuizSubmitted 
                                      ? isCorrect 
                                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-950 font-bold"
                                        : isSelected 
                                          ? "border-rose-500 bg-rose-500/10 text-rose-950"
                                          : "border-border/80 opacity-55"
                                      : isSelected 
                                        ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                                        : "border-border/80 bg-background hover:bg-muted/30"
                                  )}
                                >
                                  <span className={cn(
                                    "flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                                    isSelected ? "bg-brand-primary text-white" : "bg-muted text-foreground"
                                  )}>
                                    {String.fromCharCode(65 + oIdx)}
                                  </span>
                                  <div className="flex-1 leading-normal">
                                    <MarkdownRenderer content={opt} />
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      {actionQuizSubmitted && (
                        <div className="mt-4 p-3 bg-muted/40 border border-border rounded-xl text-body-2xs text-muted-foreground leading-normal max-h-[140px] overflow-y-auto">
                          <span className="font-bold text-brand-primary block mb-0.5">Penjelasan Tutor:</span>
                          <MarkdownRenderer content={actionData[actionIndex].explanation} />
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-border flex items-center justify-between">
                      <div>
                        {actionQuizSubmitted && (
                          <span className="text-body-xs font-bold flex items-center gap-1">
                            {(actionData[actionIndex].correctIndices as number[]).includes(actionSelectedAnswer!) ? (
                              <span className="text-emerald-600 flex items-center gap-0.5"><Check className="size-4" /> Jawaban Tepat!</span>
                            ) : (
                              <span className="text-rose-600 flex items-center gap-0.5"><X className="size-4" /> Belum Tepat</span>
                            )}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {!actionQuizSubmitted ? (
                          <Button 
                            disabled={actionSelectedAnswer === null}
                            className="rounded-lg bg-foreground text-background font-semibold"
                            onClick={() => setActionQuizSubmitted(true)}
                          >
                            Periksa
                          </Button>
                        ) : (
                          <Button
                            className="rounded-lg bg-brand-primary text-white font-semibold flex items-center gap-1"
                            onClick={() => {
                              if (actionIndex < actionData.length - 1) {
                                setActionIndex(actionIndex + 1);
                                setActionSelectedAnswer(null);
                                setActionQuizSubmitted(false);
                              } else {
                                toast.success("Latihan kuis cepat selesai!");
                                setActiveAction("none");
                              }
                            }}
                          >
                            <span>Lanjut</span>
                            <ArrowRight className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </TutorContext.Provider>
  );
}
