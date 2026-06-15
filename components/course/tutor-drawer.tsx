"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  RefreshCw,
  FileQuestion,
  Lightbulb
} from "lucide-react";
import { 
  explainConceptAction, 
  analyzeMistakeAction, 
  buildStudyPlanAction, 
  generatePracticeQuizAction, 
  startFlashcardReviewAction, 
  openMaterialAction,
  askTutorRagAction
} from "@/app/actions/tutor";
import { MarkdownRenderer } from "@/components/course/markdown-renderer";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Fetch extra actions from custom action file
import { getFlashcardsForKOAction } from "@/app/actions/tutor-extra";

type TutorMode = "explain" | "mistake" | "study-plan" | null;
type ActiveAction = "none" | "flashcards" | "practice-quiz";

interface ChatMessage {
  id: string;
  role: "student" | "ai";
  content: string;
  sources?: Array<{ type: string; id: string; label: string; href: string }>;
}

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
  const pathname = usePathname();
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

  // Chat conversation state
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = React.useState("");
  const [chatLoading, setChatLoading] = React.useState(false);

  // Ref for auto-scrolling
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Active micro-app widget inside drawer (e.g. Flashcards or Quiz)
  const [activeAction, setActiveAction] = React.useState<ActiveAction>("none");
  const [actionData, setActionData] = React.useState<any[]>([]);
  const [actionIndex, setActionIndex] = React.useState(0);
  const [actionFlipped, setActionFlipped] = React.useState(false);
  const [actionSelectedAnswer, setActionSelectedAnswer] = React.useState<number | null>(null);
  const [actionQuizSubmitted, setActionQuizSubmitted] = React.useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, chatLoading]);

  const openExplain = React.useCallback((id: string, initialMode: "content" | "analogy" | "simplification" = "content") => {
    setKoId(id);
    setQuestionId(null);
    setUserAnswer(null);
    setExplainMode(initialMode);
    setActiveMode("explain");
    setActiveAction("none");
    setMessages([]);
    setIsOpen(true);
  }, []);

  const openMistake = React.useCallback((qId: string, answerText: string) => {
    setKoId(null);
    setQuestionId(qId);
    setUserAnswer(answerText);
    setActiveMode("mistake");
    setActiveAction("none");
    setMessages([]);
    setIsOpen(true);
  }, []);

  const openStudyPlan = React.useCallback(() => {
    setKoId(null);
    setQuestionId(null);
    setUserAnswer(null);
    setActiveMode("study-plan");
    setActiveAction("none");
    setMessages([]);
    setIsOpen(true);
  }, []);

  const close = React.useCallback(() => {
    setIsOpen(false);
    setActiveMode(null);
    setData(null);
    setMessages([]);
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

  // Synchronize data results to chat messages history
  React.useEffect(() => {
    if (!data) return;
    
    if (activeMode === "explain") {
      // Content/definition display
      setMessages([
        {
          id: "initial-q",
          role: "student",
          content: `Jelaskan konsep: ${data.title}`,
        },
        {
          id: "initial-a",
          role: "ai",
          content: data.content,
          sources: data.sources || [],
        }
      ]);
    } else if (activeMode === "mistake") {
      setMessages([
        {
          id: "initial-q",
          role: "student",
          content: `Analisis kesalahanku pada soal kuis.`,
        },
        {
          id: "initial-a",
          role: "ai",
          content: `### Temuan Miskonsepsi Utama:\n${data.detectedMisconception}\n\n### Kesalahan Perhitungan / Substitusi:\n${data.mathematicalError}\n\n### Panduan Berpikir (Socratic):\n${data.socraticGuidance}`,
        }
      ]);
    } else if (activeMode === "study-plan") {
      const formattedPlan = data.map((step: string) => step).join("\n\n");
      setMessages([
        {
          id: "initial-q",
          role: "student",
          content: "Tampilkan rencana belajar mandiriku.",
        },
        {
          id: "initial-a",
          role: "ai",
          content: `### Rencana Studi Mandiri Anda:\n\n${formattedPlan}`,
        }
      ]);
    }
  }, [data, activeMode]);

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
    setLoading(true);
    try {
      const res = await generatePracticeQuizAction(targetKoId, "medium");
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

  // Handle sending arbitrary chat messages (Conversational Socratic AI Chat)
  const handleSend = async () => {
    const questionText = inputVal.trim();
    if (!questionText) return;

    setInputVal("");
    setMessages((prev) => [
      ...prev,
      {
        id: `user-msg-${Date.now()}`,
        role: "student",
        content: questionText,
      },
    ]);
    setChatLoading(true);

    try {
      // Determine course ID from current path or fallback safely
      const courseId = pathname?.startsWith("/courses/") 
        ? pathname.split("/")[2] 
        : "kalkulus-ia";
      
      const res = await askTutorRagAction(courseId, null, questionText);
      
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-msg-${Date.now()}`,
          role: "ai",
          content: res.answer || "Maaf, saya tidak dapat memproses jawaban saat ini.",
          sources: res.sources || [],
        },
      ]);
    } catch (err: any) {
      toast.error(err?.message || "Gagal memproses pertanyaan.");
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <TutorContext.Provider value={{ openExplain, openMistake, openStudyPlan, close, isOpen, activeMode }}>
      {children}
      
      <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
        <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col h-full bg-background border-l border-border select-none">
          
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
          <div className="flex-1 overflow-y-auto p-5 space-y-5 flex flex-col justify-start select-text">
            
            {/* Loading Indicator */}
            {loading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <Loader2 className="size-8 text-brand-primary animate-spin" />
                <p className="text-body-xs font-semibold text-muted-foreground">Tutor sedang merangkum jawaban...</p>
              </div>
            )}

            {/* Error Display */}
            {!loading && errors.length > 0 && (
              <div className="rounded-2xl border border-rose-200/60 bg-rose-500/5 p-4 space-y-3 text-left">
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

            {/* Message Stream */}
            {messages.length > 0 && (
              <div className="space-y-4 flex-1 flex flex-col justify-start">
                {messages.map((msg) => {
                  const isStudent = msg.role === "student";
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "max-w-[85%] rounded-2xl p-4 text-body-sm leading-relaxed text-left flex flex-col gap-2",
                        isStudent 
                          ? "bg-primary text-primary-foreground self-end rounded-tr-none" 
                          : "bg-muted text-foreground self-start rounded-tl-none border border-border/60"
                      )}
                    >
                      <MarkdownRenderer content={msg.content} />
                      
                      {/* Citations / Sources */}
                      {!isStudent && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Sumber</span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.sources.map((src, i) => (
                              <a
                                key={`${src.id}-${i}`}
                                href={src.href}
                                className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted/40 transition-colors"
                              >
                                {src.type === "question" ? (
                                  <FileQuestion className="size-3 text-brand-primary" />
                                ) : (
                                  <BookOpen className="size-3 text-brand-primary" />
                                )}
                                {src.label}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Socratic Helper triggers on last message */}
                {activeMode === "explain" && activeAction === "none" && !chatLoading && (
                  <div className="grid grid-cols-2 gap-2 pt-2 self-start w-full">
                    <Button 
                      variant="outline" 
                      className="rounded-lg h-9 text-body-xs"
                      onClick={async () => {
                        setExplainMode("analogy");
                        setMessages((prev) => [
                          ...prev,
                          { id: `u-ana-${Date.now()}`, role: "student", content: "Berikan analogi untuk konsep ini." }
                        ]);
                        setChatLoading(true);
                        try {
                          const res = await explainConceptAction(koId!, "analogy");
                          if (res.success) {
                            setMessages((prev) => [
                              ...prev,
                              { id: `ai-ana-${Date.now()}`, role: "ai", content: `### Analogi Konsep\n\n> &ldquo;${res.data.analogy}&rdquo;\n\n**Miskonsepsi Umum:**\n${res.data.commonMisconception}` }
                            ]);
                          }
                        } catch {
                          toast.error("Gagal memuat analogi.");
                        } finally {
                          setChatLoading(false);
                        }
                      }}
                    >
                      <Compass className="size-3.5 mr-1" />
                      Gunakan Analogi
                    </Button>
                    <Button 
                      variant="outline" 
                      className="rounded-lg h-9 text-body-xs"
                      onClick={async () => {
                        setExplainMode("simplification");
                        setMessages((prev) => [
                          ...prev,
                          { id: `u-simp-${Date.now()}`, role: "student", content: "Sederhanakan penjelasan konsep ini." }
                        ]);
                        setChatLoading(true);
                        try {
                          const res = await explainConceptAction(koId!, "simplification");
                          if (res.success) {
                            setMessages((prev) => [
                              ...prev,
                              { id: `ai-simp-${Date.now()}`, role: "ai", content: `### Penjelasan Sederhana\n\n${res.data.simplification}\n\n**Miskonsepsi Umum:**\n${res.data.commonMisconception}` }
                            ]);
                          }
                        } catch {
                          toast.error("Gagal menyederhanakan.");
                        } finally {
                          setChatLoading(false);
                        }
                      }}
                    >
                      <RefreshCw className="size-3.5 mr-1" />
                      Sederhanakan
                    </Button>
                  </div>
                )}

                {/* Socratic Practice Actions */}
                {activeMode === "explain" && activeAction === "none" && !chatLoading && (
                  <div className="pt-4 border-t border-border space-y-2 w-full">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">Latihan Pembelajaran:</span>
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
                    </div>
                  </div>
                )}

                {/* Typing Indicator */}
                {chatLoading && (
                  <div className="flex w-fit items-center gap-1 rounded-2xl bg-muted border border-border/65 px-4 py-3 self-start rounded-tl-none">
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className="size-1.5 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: `${dot * 150}ms` }}
                      />
                    ))}
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          {messages.length > 0 && activeAction === "none" && (
            <div className="p-4 border-t border-border/80 bg-background flex gap-2 shrink-0 select-text">
              <Input
                placeholder="Tanyakan follow-up..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={chatLoading}
                className="rounded-xl focus-visible:ring-brand-primary"
              />
              <Button
                onClick={handleSend}
                disabled={chatLoading || !inputVal.trim()}
                className="rounded-xl bg-brand-primary hover:bg-brand-primary/95 text-white font-semibold"
              >
                Kirim
              </Button>
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
                            <div className="flex-1 text-left leading-normal">
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
        </SheetContent>
      </Sheet>
    </TutorContext.Provider>
  );
}
