"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { 
  Download, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  ChevronLeft, 
  ChevronRight, 
  Monitor, 
  Settings, 
  BookOpen, 
  Layers, 
  Search, 
  Bookmark, 
  BookmarkCheck, 
  FileText, 
  NotebookPen, 
  CheckCircle2, 
  PanelLeftClose, 
  PanelLeft, 
  Palette, 
  Plus, 
  Trash2, 
  X, 
  Check 
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getYoutubeEmbedUrl } from "@/lib/youtube";
import type { CourseMaterial } from "@/lib/student-course-fixtures";
import { updateMaterialProgress } from "@/app/dashboard/actions";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/course/markdown-renderer";

type MaterialViewerProps = {
  material: CourseMaterial;
};

type ThemeMode = "light" | "sepia" | "cream" | "dark";

// Highlight helper component to visually underline searched terms
function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) return <span>{text}</span>;
  
  const escapedQuery = escapeRegExp(query.trim());
  const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"));
  
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <mark 
            key={i} 
            className="bg-amber-300/60 dark:bg-amber-700/80 text-amber-950 dark:text-amber-100 rounded-sm px-0.5 border-b border-amber-500 font-medium transition-all duration-200"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

// Full page contents for Calculus exam with highlighting hooks
const getMockPageContent = (pageNum: number, query: string) => {
  const highlight = (text: string) => <Highlight text={text} query={query} />;

  switch (pageNum) {
    case 1:
      return (
        <div className="space-y-8 text-center py-8">
          <div className="mx-auto size-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-2 font-bold text-h5">ITB</div>
          <h2 className="font-heading text-h5 md:text-h4 font-bold tracking-tight">
            {highlight("UJIAN TENGAH SEMESTER (UTS) II")}
          </h2>
          <h3 className="font-heading text-body-lg font-semibold text-muted-foreground mt-1">
            {highlight("MA1101 KALKULUS I")}
          </h3>
          
          <div className="w-12 h-0.5 bg-rose-500/30 mx-auto my-6" />

          <p className="text-body-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            {highlight("Fakultas Matematika dan Ilmu Pengetahuan Alam (FMIPA)")}<br />
            {highlight("Institut Teknologi Bandung")}
          </p>
          
          <div className="mt-8 rounded-2xl bg-muted/40 p-5 inline-block text-left text-body-xs font-mono border border-border/60 backdrop-blur-xs space-y-1">
            <div><span className="text-muted-foreground">Tahun Akademik:</span> {highlight("2024/2025")}</div>
            <div><span className="text-muted-foreground">Durasi Ujian:</span> {highlight("120 Menit")}</div>
            <div><span className="text-muted-foreground">Sifat Ujian:</span> {highlight("Tutup Buku (Closed Book)")}</div>
          </div>
        </div>
      );
    case 2:
      return (
        <div className="space-y-4 text-left">
          <h3 className="font-heading text-body-md font-bold text-rose-500 border-b border-border pb-1">
            {highlight("1. Limit Fungsi Secara Intuitif")}
          </h3>
          <p className="text-body-sm leading-relaxed">
            {highlight("Mengatakan bahwa lim x → c f(x) = L berarti bahwa bilamana x dekat tetapi berbeda dari c, maka f(x) dekat ke L.")}
          </p>
          
          <h4 className="font-semibold text-body-xs uppercase tracking-wider text-muted-foreground mt-4 mb-2">
            {highlight("Teorema Limit Utama:")}
          </h4>
          <div className="bg-muted/30 p-4 rounded-xl border border-border/80 space-y-2 text-body-xs font-mono leading-relaxed">
            <div>1. {highlight("lim x → c k = k")}</div>
            <div>2. {highlight("lim x → c x = c")}</div>
            <div>3. {highlight("lim x → c [k · f(x)] = k · lim x → c f(x)")}</div>
            <div>4. {highlight("lim x → c [f(x) ± g(x)] = lim x → c f(x) ± lim x → c g(x)")}</div>
          </div>

          <div className="p-3.5 bg-brand-primary/5 rounded-xl border border-brand-primary/10 text-body-xs leading-relaxed mt-4">
            <span className="font-semibold block text-brand-primary mb-1">{highlight("Definisi Presisi (Limit ε-δ):")}</span>
            {highlight("lim x → c f(x) = L berarti bahwa untuk setiap ε > 0, terdapat δ > 0 sedemikian rupa sehingga: 0 < |x - c| < δ → |f(x) - L| < ε.")}
          </div>
        </div>
      );
    case 3:
      return (
        <div className="space-y-4 text-left">
          <h3 className="font-heading text-body-md font-bold text-rose-500 border-b border-border pb-1">
            {highlight("2. Turunan Fungsi (Diferensial)")}
          </h3>
          <p className="text-body-sm leading-relaxed">
            {highlight("Turunan fungsi f di titik x dinyatakan dengan f'(x), yang menyatakan laju perubahan nilai fungsi di titik tersebut.")}
          </p>

          <h4 className="font-semibold text-body-xs uppercase tracking-wider text-muted-foreground mt-4 mb-2">
            {highlight("Aturan-Aturan Turunan Dasar:")}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body-xs font-mono">
            <div className="bg-muted/30 p-3 rounded-lg border border-border/60">
              <span className="font-semibold text-rose-500 block text-[10px] uppercase mb-0.5">{highlight("Aturan Pangkat")}</span>
              {highlight("d/dx (xⁿ) = n·xⁿ⁻¹")}
            </div>
            <div className="bg-muted/30 p-3 rounded-lg border border-border/60">
              <span className="font-semibold text-rose-500 block text-[10px] uppercase mb-0.5">{highlight("Aturan Perkalian")}</span>
              {highlight("d/dx (u·v) = u'v + uv'")}
            </div>
            <div className="bg-muted/30 p-3 rounded-lg border border-border/60">
              <span className="font-semibold text-rose-500 block text-[10px] uppercase mb-0.5">{highlight("Aturan Pembagian")}</span>
              {highlight("d/dx (u/v) = (u'v - uv') / v²")}
            </div>
            <div className="bg-muted/30 p-3 rounded-lg border border-border/60">
              <span className="font-semibold text-rose-500 block text-[10px] uppercase mb-0.5">{highlight("Aturan Rantai")}</span>
              {highlight("d/dx (f(g(x))) = f'(g(x))·g'(x)")}
            </div>
          </div>

          <h4 className="font-semibold text-body-xs uppercase tracking-wider text-muted-foreground mt-4 mb-2">
            {highlight("Turunan Fungsi Trigonometri:")}
          </h4>
          <ul className="grid grid-cols-3 gap-2 text-body-xs text-muted-foreground font-mono bg-muted/10 p-2.5 rounded-lg border border-border/40">
            <li>{highlight("d/dx (sin x) = cos x")}</li>
            <li>{highlight("d/dx (cos x) = -sin x")}</li>
            <li>{highlight("d/dx (tan x) = sec² x")}</li>
          </ul>
        </div>
      );
    case 4:
      return (
        <div className="space-y-4 text-left">
          <h3 className="font-heading text-body-md font-bold text-rose-500 border-b border-border pb-1">
            {highlight("3. Latihan Soal Evaluatif")}
          </h3>
          
          <div className="space-y-3">
            <div className="p-3 bg-muted/30 border border-border/80 rounded-xl">
              <span className="font-semibold text-[10px] uppercase tracking-wider text-brand-primary block">{highlight("Soal 1 (Limit)")}</span>
              <p className="text-body-sm text-foreground mt-1 font-sans">
                {highlight("Tentukanlah nilai limit berikut ini:")}<br />
                <span className="font-mono font-semibold block mt-1 bg-muted/40 p-1.5 rounded text-center border border-border/40">
                  {highlight("lim x → 0 (cos(4x) - 1) / (x · tan(2x))")}
                </span>
              </p>
            </div>

            <div className="p-3 bg-muted/30 border border-border/80 rounded-xl">
              <span className="font-semibold text-[10px] uppercase tracking-wider text-brand-primary block">{highlight("Soal 2 (Optimalisasi)")}</span>
              <p className="text-body-sm mt-1">
                {highlight("Diberikan f(x) = x³ - 3x² - 9x + 5. Cari interval di mana fungsi tersebut naik dan interval di mana fungsi tersebut turun!")}
              </p>
            </div>

            <div className="p-3 bg-muted/30 border border-border/80 rounded-xl">
              <span className="font-semibold text-[10px] uppercase tracking-wider text-brand-primary block">{highlight("Soal 3 (Analitis)")}</span>
              <p className="text-body-sm mt-1">
                {highlight("Tunjukkan menggunakan definisi ε-δ bahwa limit x → 2 dari (3x - 1) adalah 5!")}
              </p>
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
};

const MOCK_PAGES_META = [
  {
    pageNum: 1,
    title: "Informasi Umum & Judul",
    searchText: "ujian tengah semester uts ii ma1101 kalkulus i fakultas matematika dan ilmu pengetahuan alam fmipa institut teknologi bandung tahun akademik 2024/2025 durasi ujian 120 menit sifat ujian tutup buku closed book fmipa itb",
    icon: FileText
  },
  {
    pageNum: 2,
    title: "1. Limit Fungsi Secara Intuitif & Teorema",
    searchText: "limit fungsi secara intuitif teorema limit utama definisi presisi limit epsilon delta lim x c f x l 0 x c epsilon delta",
    icon: BookOpen
  },
  {
    pageNum: 3,
    title: "2. Aturan Turunan & Turunan Trigonometri",
    searchText: "turunan fungsi diferensial laju perubahan nilai aturan pangkat perkalian pembagian aturan rantai d/dx x n u v u v u/v f g x sin x cos x tan x sec",
    icon: BookOpen
  },
  {
    pageNum: 4,
    title: "3. Latihan Soal Evaluatif UTS",
    searchText: "latihan soal evaluatif soal 1 limit cos 4x 1 x tan 2x soal 2 f x x3 3x2 9x 5 interval naik turun soal 3 definisi epsilon delta limit x 2 3x 1 adalah 5",
    icon: FileText
  }
];

export function MaterialViewer({ material }: MaterialViewerProps) {
  const [done, setDone] = useState(material.completed);
  const [viewerType, setViewerType] = useState<"custom" | "chrome">("custom");
  
  // Custom PDF states
  const [page, setPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");
  
  // Interactive Sidebar states
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"outline" | "thumbnails" | "search" | "notes">("outline");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeHighlightQuery, setActiveHighlightQuery] = useState("");
  const [readingProgress, setReadingProgress] = useState(0);
  const [visitedPages, setVisitedPages] = useState<Set<number>>(new Set([1]));

  // Personal notes and bookmarks (localStorage backed)
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [activeNoteText, setActiveNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  const viewerRef = useRef<HTMLDivElement>(null);
  const noteSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Set document as in progress on mount
  useEffect(() => {
    updateMaterialProgress(material.id, "in_progress").catch((err) =>
      console.error("Error updating progress to in_progress:", err)
    );
  }, [material.id]);

  // Load personalization states from localStorage
  useEffect(() => {
    try {
      const storedNotes = localStorage.getItem(`zyx-notes-${material.id}`);
      const storedBookmarks = localStorage.getItem(`zyx-bookmarks-${material.id}`);
      const storedTheme = localStorage.getItem(`zyx-reader-theme`);
      const storedSidebar = localStorage.getItem(`zyx-reader-sidebar`);

      if (storedNotes) setNotes(JSON.parse(storedNotes));
      if (storedBookmarks) setBookmarks(JSON.parse(storedBookmarks));
      if (storedTheme) setTheme(storedTheme as ThemeMode);
      if (storedSidebar) setShowSidebar(storedSidebar === "true");
    } catch (e) {
      console.error("Could not load reader configurations from localStorage", e);
    }
  }, [material.id]);

  // Handle active note loading when page changes
  useEffect(() => {
    setActiveNoteText(notes[page] || "");
  }, [page, notes]);

  // Update visited pages tracking and overall progress
  useEffect(() => {
    setVisitedPages((prev) => {
      const updated = new Set(prev);
      updated.add(page);
      return updated;
    });
  }, [page]);

  useEffect(() => {
    const total = MOCK_PAGES_META.length;
    const progress = Math.round((visitedPages.size / total) * 100);
    setReadingProgress(progress);
    
    // Auto complete triggers when reading all pages
    if (progress === 100 && !done) {
      toast("Kamu telah membaca seluruh halaman!", {
        description: "Klik tombol 'Tandai Selesai' untuk mencatat progres kelasmu.",
        action: {
          label: "Selesaikan",
          onClick: () => markDone()
        }
      });
    }
  }, [visitedPages]);

  async function markDone() {
    try {
      const res = await updateMaterialProgress(material.id, "completed");
      if (res.success) {
        setDone(true);
        toast.success("Materi berhasil ditandai selesai!");
      } else {
        toast.error("Gagal menyimpan progres.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan koneksi.");
    }
  }

  // Toggle Fullscreen
  function toggleFullscreen() {
    if (!viewerRef.current) return;

    if (!isFullscreen) {
      if (viewerRef.current.requestFullscreen) {
        viewerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Save Bookmarks
  const toggleBookmark = (pNum: number) => {
    let newBookmarks = [...bookmarks];
    if (newBookmarks.includes(pNum)) {
      newBookmarks = newBookmarks.filter((p) => p !== pNum);
      toast.success(`Halaman ${pNum} dihapus dari penanda.`);
    } else {
      newBookmarks.push(pNum);
      newBookmarks.sort((a, b) => a - b);
      toast.success(`Halaman ${pNum} ditambahkan ke penanda.`);
    }
    setBookmarks(newBookmarks);
    localStorage.setItem(`zyx-bookmarks-${material.id}`, JSON.stringify(newBookmarks));
  };

  // Save Personal Note
  const saveNote = (noteText: string) => {
    setIsSavingNote(true);
    const newNotes = { ...notes };
    if (noteText.trim() === "") {
      delete newNotes[page];
    } else {
      newNotes[page] = noteText;
    }
    setNotes(newNotes);
    localStorage.setItem(`zyx-notes-${material.id}`, JSON.stringify(newNotes));
    
    // Simulate minor network/disk delay for a smooth "saving..." feedback
    if (noteSaveTimerRef.current) clearTimeout(noteSaveTimerRef.current);
    noteSaveTimerRef.current = setTimeout(() => {
      setIsSavingNote(false);
    }, 400);
  };

  const deleteNote = (pNum: number) => {
    const newNotes = { ...notes };
    delete newNotes[pNum];
    setNotes(newNotes);
    localStorage.setItem(`zyx-notes-${material.id}`, JSON.stringify(newNotes));
    if (pNum === page) setActiveNoteText("");
    toast.success(`Catatan pada halaman ${pNum} berhasil dihapus.`);
  };

  // Save layout states to storage
  const handleSidebarToggle = () => {
    const nextState = !showSidebar;
    setShowSidebar(nextState);
    localStorage.setItem(`zyx-reader-sidebar`, String(nextState));
  };

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    localStorage.setItem(`zyx-reader-theme`, newTheme);
  };

  // Search filter
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return MOCK_PAGES_META.filter(
      (p) => p.title.toLowerCase().includes(query) || p.searchText.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Color specs mapped to state theme mode
  const currentThemeStyle = useMemo(() => {
    const styles: Record<ThemeMode, { deskBg: string; paperBg: string; text: string; border: string }> = {
      light: {
        deskBg: "bg-zinc-100/70 border-zinc-200/80 dark:bg-zinc-950/20 dark:border-zinc-800/80",
        paperBg: "bg-white",
        text: "text-zinc-900",
        border: "border-zinc-200"
      },
      sepia: {
        deskBg: "bg-[#eedfae]/20 border-[#e5d4a1]/50",
        paperBg: "bg-[#fbf0d9]",
        text: "text-[#433422]",
        border: "border-[#e8dfc7]"
      },
      cream: {
        deskBg: "bg-[#e5ddd0]/40 border-[#d8cdb8]/60",
        paperBg: "bg-[#f7f4eb]",
        text: "text-[#2c2d30]",
        border: "border-[#eae6da]"
      },
      dark: {
        deskBg: "bg-zinc-950 border-zinc-800/80",
        paperBg: "bg-[#1e1e20]",
        text: "text-[#e0e0e0]",
        border: "border-[#2f2f31]"
      }
    };
    return styles[theme];
  }, [theme]);

  // Mini wireframe thumbnail renderer
  const renderThumbnailPreview = (pageNum: number) => {
    switch (pageNum) {
      case 1:
        return (
          <div className="flex flex-col items-center justify-between p-1.5 h-full w-full">
            <div className="w-3.5 h-3.5 rounded-full bg-rose-500/30" />
            <div className="space-y-1 w-full flex flex-col items-center">
              <div className="h-[2px] bg-zinc-300 dark:bg-zinc-700 w-10 rounded-xs" />
              <div className="h-[2px] bg-zinc-300 dark:bg-zinc-700 w-7 rounded-xs" />
            </div>
            <div className="h-[2px] bg-zinc-200 dark:bg-zinc-800 w-5 rounded-xs" />
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col justify-between p-1.5 h-full w-full">
            <div className="h-[3px] bg-rose-500/30 w-8 rounded-xs" />
            <div className="space-y-1 flex-1 py-1 flex flex-col justify-center">
              <div className="h-[2px] bg-zinc-300 dark:bg-zinc-700 w-full rounded-xs" />
              <div className="h-[2px] bg-zinc-300 dark:bg-zinc-700 w-5/6 rounded-xs" />
              <div className="h-[8px] bg-zinc-200 dark:bg-zinc-800/80 border border-zinc-300/50 dark:border-zinc-700/50 rounded-xs w-full mt-0.5" />
            </div>
            <div className="h-[2px] bg-zinc-200 dark:bg-zinc-800 w-4 rounded-xs" />
          </div>
        );
      case 3:
        return (
          <div className="flex flex-col justify-between p-1.5 h-full w-full">
            <div className="h-[3px] bg-rose-500/30 w-8 rounded-xs" />
            <div className="space-y-1 flex-1 py-1 flex flex-col justify-center">
              <div className="h-[2px] bg-zinc-300 dark:bg-zinc-700 w-8 rounded-xs" />
              <div className="grid grid-cols-2 gap-0.5 mt-0.5">
                <div className="h-[6px] bg-zinc-200 dark:bg-zinc-800/80 rounded-xs border border-zinc-300/40" />
                <div className="h-[6px] bg-zinc-200 dark:bg-zinc-800/80 rounded-xs border border-zinc-300/40" />
              </div>
            </div>
            <div className="h-[2px] bg-zinc-200 dark:bg-zinc-800 w-4 rounded-xs" />
          </div>
        );
      case 4:
        return (
          <div className="flex flex-col justify-between p-1.5 h-full w-full">
            <div className="h-[3px] bg-rose-500/30 w-8 rounded-xs" />
            <div className="space-y-1 flex-1 py-1.5 flex flex-col justify-between">
              <div className="h-[4px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 rounded-xs w-full" />
              <div className="h-[4px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 rounded-xs w-full" />
              <div className="h-[4px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 rounded-xs w-full" />
            </div>
            <div className="h-[2px] bg-zinc-200 dark:bg-zinc-800 w-4 rounded-xs" />
          </div>
        );
      default:
        return null;
    }
  };

  const openUrl = material.url ?? "#";

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Banner Control bar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        
        {/* Toggle Viewer engine (Custom vs Native Iframe) */}
        {material.kind === "pdf" && (
          <div className="flex items-center gap-1.5 bg-muted/60 p-0.5 rounded-xl border border-border">
            <button
              onClick={() => setViewerType("custom")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-body-xs font-semibold flex items-center gap-1 transition-all",
                viewerType === "custom"
                  ? "bg-card text-brand-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <BookOpen className="size-3.5" />
              Integrated Viewer
            </button>
            <button
              onClick={() => setViewerType("chrome")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-body-xs font-semibold flex items-center gap-1 transition-all",
                viewerType === "chrome"
                  ? "bg-card text-brand-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Monitor className="size-3.5" />
              Chrome Viewer (Iframe)
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={markDone}
            disabled={done}
            className={cn(
              "rounded-md text-body-xs py-1 h-auto transition-all duration-200",
              done ? "bg-muted text-muted-foreground" : "bg-brand-primary text-white hover:bg-brand-primary/95"
            )}
          >
            {done ? (
              <span className="flex items-center gap-1"><CheckCircle2 className="size-3.5 text-emerald-500" /> Selesai Pelajari</span>
            ) : (
              "Tandai Selesai"
            )}
          </Button>
          {material.url && material.kind !== "article" ? (
            <Button asChild variant="outline" className="rounded-md text-body-xs py-1 h-auto">
              <a href={openUrl} target="_blank" rel="noopener noreferrer">
                Buka Berkas Asli
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Main Material Display container */}
      <div className="rounded-3xl border border-border/80 bg-muted/10 shadow-xs relative overflow-hidden">
        
        {/* Render PDF Document (Integrated custom viewer or standard Chrome) */}
        {material.kind === "pdf" ? (
          viewerType === "custom" ? (
            
            /* Custom minimalist integrated PDF reader shell */
            <div
              ref={viewerRef}
              className={cn(
                "flex flex-col bg-background border border-border overflow-hidden shadow-sm w-full select-none transition-all duration-300 relative",
                isFullscreen ? "fixed inset-0 z-50 rounded-none w-screen h-screen" : "min-h-[580px] rounded-2xl"
              )}
            >
              {/* Sleek Reading Progress bar (topmost border) */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-border/20 z-20 overflow-hidden">
                <div 
                  className="h-full bg-brand-primary transition-all duration-500 ease-out" 
                  style={{ width: `${readingProgress}%` }}
                />
              </div>

              {/* PDF Document Shell split in Sidebar and Page Desk */}
              <div className="flex flex-1 overflow-hidden relative">
                
                {/* Collapsible Interactive Sidebar */}
                <div 
                  className={cn(
                    "border-r border-border bg-card/95 backdrop-blur-xs flex flex-col shrink-0 transition-all duration-350 z-10",
                    showSidebar 
                      ? "w-80 translate-x-0 relative" 
                      : "w-0 -translate-x-full absolute md:relative overflow-hidden border-r-0"
                  )}
                >
                  {/* Sidebar Header with dynamic controls */}
                  <div className="px-4 pt-4 pb-3 border-b border-border flex items-center justify-between">
                    <span className="text-body-xs font-heading font-bold text-foreground">
                      Index & Dokumen
                    </span>
                    <button
                      onClick={handleSidebarToggle}
                      className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground md:hidden"
                      title="Sembunyikan Sidebar"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* Sidebar Navigation Tabs */}
                  <div className="grid grid-cols-4 border-b border-border p-1 bg-muted/40 gap-0.5">
                    <button
                      onClick={() => setSidebarTab("outline")}
                      className={cn(
                        "py-1.5 rounded-lg flex flex-col items-center justify-center text-[10px] font-semibold transition-all gap-0.5",
                        sidebarTab === "outline" ? "bg-card text-brand-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Daftar Isi"
                    >
                      <BookOpen className="size-3.5" />
                      <span>Outline</span>
                    </button>
                    <button
                      onClick={() => setSidebarTab("thumbnails")}
                      className={cn(
                        "py-1.5 rounded-lg flex flex-col items-center justify-center text-[10px] font-semibold transition-all gap-0.5",
                        sidebarTab === "thumbnails" ? "bg-card text-brand-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Miniatur Halaman"
                    >
                      <Layers className="size-3.5" />
                      <span>Miniatur</span>
                    </button>
                    <button
                      onClick={() => setSidebarTab("search")}
                      className={cn(
                        "py-1.5 rounded-lg flex flex-col items-center justify-center text-[10px] font-semibold transition-all gap-0.5 relative",
                        sidebarTab === "search" ? "bg-card text-brand-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Cari Kata"
                    >
                      <Search className="size-3.5" />
                      <span>Cari</span>
                      {activeHighlightQuery && (
                        <span className="absolute top-1 right-3 size-1.5 rounded-full bg-rose-500 animate-pulse" />
                      )}
                    </button>
                    <button
                      onClick={() => setSidebarTab("notes")}
                      className={cn(
                        "py-1.5 rounded-lg flex flex-col items-center justify-center text-[10px] font-semibold transition-all gap-0.5 relative",
                        sidebarTab === "notes" ? "bg-card text-brand-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Catatan & Penanda"
                    >
                      <NotebookPen className="size-3.5" />
                      <span>Catatan</span>
                      {(Object.keys(notes).length > 0 || bookmarks.length > 0) && (
                        <span className="absolute top-1 right-2 bg-brand-secondary/90 text-white rounded-md px-1 text-[8px] font-mono leading-none scale-85">
                          {Object.keys(notes).length + bookmarks.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Sidebar Tab Content panels */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-4">
                    
                    {/* Outline Tab */}
                    {sidebarTab === "outline" && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-2 px-1">
                          Struktur Materi
                        </span>
                        {MOCK_PAGES_META.map((p) => {
                          const IconComp = p.icon;
                          const hasNote = notes[p.pageNum];
                          const hasBookmark = bookmarks.includes(p.pageNum);

                          return (
                            <button
                              key={p.pageNum}
                              onClick={() => setPage(p.pageNum)}
                              className={cn(
                                "w-full text-left p-2.5 rounded-xl text-body-xs font-medium flex items-center justify-between border transition-all duration-200",
                                page === p.pageNum
                                  ? "bg-brand-primary/5 border-brand-primary/20 text-brand-primary font-semibold"
                                  : "border-transparent text-foreground hover:bg-muted/60"
                              )}
                            >
                              <div className="flex items-center gap-2 truncate pr-1">
                                <IconComp className={cn("size-3.5 shrink-0", page === p.pageNum ? "text-brand-primary" : "text-muted-foreground")} />
                                <span className="truncate">{p.title}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[9px] shrink-0">
                                {hasBookmark && <Bookmark className="size-3 text-brand-secondary fill-brand-secondary shrink-0" />}
                                {hasNote && <NotebookPen className="size-3 text-sky-500 shrink-0" />}
                                <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-semibold">
                                  H{p.pageNum}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Thumbnails Tab */}
                    {sidebarTab === "thumbnails" && (
                      <div className="grid grid-cols-2 gap-3 p-1">
                        {MOCK_PAGES_META.map((p) => (
                          <button
                            key={p.pageNum}
                            onClick={() => setPage(p.pageNum)}
                            className={cn(
                              "flex flex-col items-center p-1.5 rounded-xl border transition-all duration-200 group text-center gap-1",
                              page === p.pageNum
                                ? "border-brand-primary bg-brand-primary/5 ring-2 ring-brand-primary/20 shadow-md"
                                : "border-border hover:border-border-strong hover:bg-muted/30"
                            )}
                          >
                            <div className="h-20 w-16 overflow-hidden rounded-md bg-muted/40 border border-border/80 shadow-xs relative">
                              {renderThumbnailPreview(p.pageNum)}
                              {visitedPages.has(p.pageNum) && (
                                <span className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 scale-75 shadow-xs">
                                  <Check className="size-2 stroke-[3px]" />
                                </span>
                              )}
                            </div>
                            <span className={cn(
                              "text-[10px] font-mono font-bold mt-1 tracking-wide",
                              page === p.pageNum ? "text-brand-primary" : "text-muted-foreground group-hover:text-foreground"
                            )}>
                              Halaman {p.pageNum}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Search / Indexing Tab */}
                    {sidebarTab === "search" && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-1">
                            Indeks Pencarian Kata
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setActiveHighlightQuery(e.target.value);
                              }}
                              placeholder="Ketik kata kunci (e.g. limit, turunan)..."
                              className="w-full bg-muted/60 text-body-xs border border-border rounded-xl pl-8 pr-8 py-2 focus:bg-card focus:outline-none transition-all placeholder:text-muted-foreground text-foreground"
                            />
                            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                            {searchQuery && (
                              <button
                                onClick={() => {
                                  setSearchQuery("");
                                  setActiveHighlightQuery("");
                                }}
                                className="absolute right-2.5 top-2.5 p-0.5 rounded-full hover:bg-muted text-muted-foreground"
                                title="Bersihkan Pencarian"
                              >
                                <X className="size-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Search Matches list */}
                        {searchQuery.trim() ? (
                          <div className="space-y-2">
                            <span className="text-[9px] font-semibold text-muted-foreground px-1 block">
                              Ditemukan {searchResults.length} halaman yang cocok:
                            </span>
                            {searchResults.length > 0 ? (
                              <div className="space-y-1.5">
                                {searchResults.map((r) => (
                                  <button
                                    key={r.pageNum}
                                    onClick={() => {
                                      setPage(r.pageNum);
                                      setActiveHighlightQuery(searchQuery);
                                    }}
                                    className={cn(
                                      "w-full text-left p-2.5 rounded-xl border text-body-xs transition-all hover:bg-muted/50 border-border/80 flex flex-col gap-1",
                                      page === r.pageNum && "bg-brand-primary/5 border-brand-primary/20"
                                    )}
                                  >
                                    <div className="flex items-center justify-between w-full font-bold">
                                      <span className="text-foreground font-heading text-[11px] truncate max-w-[180px]">
                                        {r.title}
                                      </span>
                                      <span className="font-mono text-[9px] bg-muted px-1 py-0.5 rounded text-muted-foreground">
                                        Hal {r.pageNum}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed bg-muted/20 p-1.5 rounded-lg border border-border/40 font-mono">
                                      <Highlight text={r.searchText} query={searchQuery} />
                                    </p>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6 text-body-xs text-muted-foreground border border-dashed border-border rounded-xl">
                                Tidak ada kata pencarian yang cocok.
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-body-xs text-muted-foreground/80 border border-dashed border-border rounded-xl font-mono leading-relaxed px-2 bg-muted/10">
                            Masukkan kata kunci di atas untuk mencari istilah penting dalam dokumen secara instan.
                          </div>
                        )}

                        {activeHighlightQuery && (
                          <div className="bg-amber-500/10 border border-amber-500/25 p-3 rounded-2xl flex items-center justify-between gap-1">
                            <div className="text-[10px] text-amber-900 dark:text-amber-200">
                              Sorotan kata <b className="font-mono font-bold bg-amber-500/20 px-1 rounded">&ldquo;{activeHighlightQuery}&rdquo;</b> aktif di halaman.
                            </div>
                            <button
                              onClick={() => setActiveHighlightQuery("")}
                              className="text-[10px] text-rose-500 font-semibold hover:underline flex items-center gap-0.5 shrink-0"
                            >
                              Hapus
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes & Bookmarks Tab */}
                    {sidebarTab === "notes" && (
                      <div className="space-y-4">
                        
                        {/* Bookmarks Section */}
                        <div className="space-y-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block px-1">
                            Penanda Halaman (Bookmarks)
                          </span>
                          {bookmarks.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 p-1">
                              {bookmarks.map((pNum) => (
                                <div
                                  key={pNum}
                                  className={cn(
                                    "flex items-center gap-1.5 text-body-xs font-medium pl-2.5 pr-1.5 py-1 rounded-md border shadow-2xs transition-all",
                                    page === pNum
                                      ? "bg-brand-primary text-white border-brand-primary"
                                      : "bg-card text-foreground border-border hover:border-border-strong"
                                  )}
                                >
                                  <button onClick={() => setPage(pNum)} className="font-mono font-bold">
                                    Hal {pNum}
                                  </button>
                                  <button
                                    onClick={() => toggleBookmark(pNum)}
                                    className={cn(
                                      "p-0.5 rounded-full hover:bg-black/10 text-muted-foreground",
                                      page === pNum ? "text-white/80 hover:text-white" : "hover:text-rose-500"
                                    )}
                                    title="Hapus Penanda"
                                  >
                                    <X className="size-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-body-xs text-muted-foreground border border-dashed border-border rounded-xl">
                              Belum ada halaman yang ditandai.
                            </div>
                          )}
                        </div>

                        {/* Page Notes Manager */}
                        <div className="space-y-2.5 pt-2 border-t border-border/80">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block px-1">
                            Catatan Halaman {page}
                          </span>
                          
                          <div className="space-y-1.5">
                            <textarea
                              value={activeNoteText}
                              onChange={(e) => {
                                setActiveNoteText(e.target.value);
                                saveNote(e.target.value);
                              }}
                              placeholder="Tulis catatan penting untuk halaman ini..."
                              rows={4}
                              className="w-full bg-muted/40 text-body-xs border border-border rounded-xl p-2.5 focus:bg-card focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all text-foreground resize-none leading-relaxed"
                            />
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
                              <span>{isSavingNote ? "Menyimpan catatan..." : "Tersimpan di browser"}</span>
                              {notes[page] && (
                                <button
                                  onClick={() => deleteNote(page)}
                                  className="text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-0.5 transition-colors"
                                >
                                  <Trash2 className="size-3" /> Hapus
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* All Stored Notes List */}
                        <div className="space-y-2 pt-2 border-t border-border/80">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block px-1">
                            Semua Catatan Anda ({Object.keys(notes).length})
                          </span>
                          {Object.keys(notes).length > 0 ? (
                            <div className="space-y-2">
                              {Object.entries(notes).map(([pStr, text]) => {
                                const pNum = parseInt(pStr);
                                return (
                                  <div
                                    key={pNum}
                                    className={cn(
                                      "p-2.5 rounded-xl border text-body-xs transition-all flex flex-col gap-1 hover:bg-muted/30",
                                      page === pNum ? "bg-brand-primary/5 border-brand-primary/20" : "border-border/80 bg-card"
                                    )}
                                  >
                                    <div className="flex items-center justify-between">
                                      <button
                                        onClick={() => setPage(pNum)}
                                        className="font-semibold text-brand-primary hover:underline font-mono text-[10px]"
                                      >
                                        Halaman {pNum}
                                      </button>
                                      <button
                                        onClick={() => deleteNote(pNum)}
                                        className="p-1 text-muted-foreground hover:text-rose-500 rounded-md hover:bg-muted"
                                        title="Hapus Catatan"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </button>
                                    </div>
                                    <p className="text-muted-foreground line-clamp-3 leading-relaxed whitespace-pre-wrap">
                                      {text}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-body-xs text-muted-foreground border border-dashed border-border rounded-xl">
                              Belum ada catatan yang ditulis.
                            </div>
                          )}
                        </div>

                      </div>
                    )}

                  </div>
                </div>

                {/* Main PDF Canvas reader desk */}
                <div className="flex-1 overflow-auto flex flex-col items-center justify-start py-8 px-4 md:px-8 relative min-w-0 transition-colors duration-300 bg-zinc-100 dark:bg-zinc-950/20">
                  
                  {/* Floating Toggle Sidebar button for desktop */}
                  {!showSidebar && (
                    <button
                      onClick={handleSidebarToggle}
                      className="absolute top-4 left-4 p-2.5 rounded-xl bg-card border border-border shadow-md text-foreground hover:bg-muted transition-all duration-200 z-10"
                      title="Tampilkan Sidebar"
                    >
                      <PanelLeft className="size-4" />
                    </button>
                  )}

                  {/* Bookmark Button directly overlaying the page canvas */}
                  <div className="w-full max-w-[620px] flex justify-end mb-2">
                    <button
                      onClick={() => toggleBookmark(page)}
                      className={cn(
                        "p-1.5 rounded-md border shadow-2xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 text-body-xs font-semibold px-3.5",
                        bookmarks.includes(page)
                          ? "bg-brand-secondary text-white border-brand-secondary"
                          : "bg-card text-muted-foreground border-border hover:text-foreground"
                      )}
                      title={bookmarks.includes(page) ? "Hapus Penanda" : "Tandai Halaman Ini"}
                    >
                      {bookmarks.includes(page) ? (
                        <>
                          <BookmarkCheck className="size-3.5 text-white" />
                          <span>Ditandai</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="size-3.5" />
                          <span>Tandai Halaman</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Dynamic Scaling viewport container */}
                  <div className="flex-1 flex items-center justify-center w-full min-h-[480px]">
                    <div
                      className={cn(
                        "transition-all duration-250 ease-out origin-center rounded-2xl shadow-xl overflow-hidden border border-solid p-6 md:p-10",
                        currentThemeStyle.paperBg,
                        currentThemeStyle.text,
                        currentThemeStyle.border
                      )}
                      style={{
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: "center center",
                        width: "600px",
                        maxWidth: "100%"
                      }}
                    >
                      <div className="h-full flex flex-col justify-between min-h-[400px]">
                        {/* Render customized page body */}
                        <div className="flex-1">
                          {getMockPageContent(page, activeHighlightQuery)}
                        </div>
                        
                        {/* Elegant minimalist academic footer */}
                        <div className="border-t border-border/60 pt-4 mt-6 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                          <span className="truncate max-w-[150px] sm:max-w-xs">{material.title}</span>
                          <span className="shrink-0">Halaman {page} dari {MOCK_PAGES_META.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Spacer for Toolbar */}
                  <div className="h-20" />

                  {/* Floating Glassmorphic Control Toolbar */}
                  <div className="absolute bottom-6 left-1/2 translate-x-[-50%] bg-card/90 backdrop-blur-md border border-border shadow-lg rounded-2xl px-4 py-2 flex items-center gap-3.5 z-10 transition-all duration-200 hover:bg-card hover:shadow-xl w-max max-w-[90vw]">
                    
                    {/* Toggle Sidebar */}
                    <button
                      onClick={handleSidebarToggle}
                      className={cn(
                        "p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors hidden md:block",
                        showSidebar && "text-brand-primary"
                      )}
                      title={showSidebar ? "Sembunyikan Menu" : "Tampilkan Menu"}
                    >
                      <PanelLeftClose className="size-4" />
                    </button>

                    <span className="w-px h-4 bg-border hidden md:block" />

                    {/* Page Controller */}
                    <div className="flex items-center gap-2">
                      <button
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                        className="p-1 rounded-full bg-muted/60 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        title="Halaman Sebelumnya"
                      >
                        <ChevronLeft className="size-4 text-foreground" />
                      </button>
                      <span className="text-body-xs font-mono font-bold text-foreground select-none shrink-0">
                        {page} <span className="text-muted-foreground">/</span> {MOCK_PAGES_META.length}
                      </span>
                      <button
                        disabled={page === MOCK_PAGES_META.length}
                        onClick={() => setPage(page + 1)}
                        className="p-1 rounded-full bg-muted/60 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        title="Halaman Selanjutnya"
                      >
                        <ChevronRight className="size-4 text-foreground" />
                      </button>
                    </div>

                    <span className="w-px h-4 bg-border" />

                    {/* Zoom Engine */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setZoom(Math.max(50, zoom - 25))}
                        className="p-1 rounded-full bg-muted/60 hover:bg-muted transition-all"
                        title="Perkecil"
                      >
                        <ZoomOut className="size-3.5 text-foreground" />
                      </button>
                      <span className="font-mono text-[10px] font-bold text-foreground w-10 text-center select-none">
                        {zoom}%
                      </span>
                      <button
                        onClick={() => setZoom(Math.min(150, zoom + 25))}
                        className="p-1 rounded-full bg-muted/60 hover:bg-muted transition-all"
                        title="Perbesar"
                      >
                        <ZoomIn className="size-3.5 text-foreground" />
                      </button>
                    </div>

                    <span className="w-px h-4 bg-border" />

                    {/* Personal Theme Switcher */}
                    <div className="flex items-center gap-1">
                      {(["light", "sepia", "cream", "dark"] as ThemeMode[]).map((tMode) => {
                        const bgClass = {
                          light: "bg-white border-zinc-300",
                          sepia: "bg-[#fbf0d9] border-[#e8dfc7]",
                          cream: "bg-[#f7f4eb] border-[#eae6da]",
                          dark: "bg-zinc-950 border-zinc-800"
                        }[tMode];
                        
                        return (
                          <button
                            key={tMode}
                            onClick={() => handleThemeChange(tMode)}
                            className={cn(
                              "size-5 rounded-full border transition-all hover:scale-110 active:scale-95 flex items-center justify-center shrink-0",
                              bgClass,
                              theme === tMode ? "ring-2 ring-brand-primary ring-offset-1 border-transparent scale-105" : "opacity-80"
                            )}
                            title={`Tema ${tMode.toUpperCase()}`}
                          >
                            {theme === tMode && (
                              <span className={cn("size-1.5 rounded-full", tMode === "dark" ? "bg-white" : "bg-brand-primary")} />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <span className="w-px h-4 bg-border hidden sm:block" />

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={toggleFullscreen}
                        className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                        title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
                      >
                        {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                      </button>
                      {material.url && (
                        <a
                          href={material.url}
                          download
                          className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                          title="Unduh Berkas PDF"
                        >
                          <Download className="size-4" />
                        </a>
                      )}
                    </div>

                  </div>

                </div>

              </div>

            </div>
          ) : (
            /* Chrome Native Browser PDF Viewer (iframe fallback) */
            <div className="space-y-4 font-sans p-4">
              <p className="text-body-sm text-muted-foreground">
                Pratinjau PDF bawaan browser di bawah ini. Gunakan tombol unduh jika tidak termuat.
              </p>
              <div className="w-full aspect-video overflow-hidden border border-border bg-[#333] rounded-2xl relative shadow-md">
                <iframe
                  title={material.title}
                  src={material.url}
                  className="w-full h-full border-0"
                />
              </div>
              <Button asChild variant="outline">
                <a href={material.url} download target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 size-4" aria-hidden />
                  Unduh Dokumen PDF
                </a>
              </Button>
            </div>
          )
        ) : null}

        {/* Article Reader (Upgraded with theme customization support!) */}
        {material.kind === "article" && material.body ? (
          <div className={cn(
            "transition-colors duration-300 p-6 md:p-12 relative flex flex-col items-center",
            currentThemeStyle.deskBg
          )}>
            {/* Reading settings overlay for articles */}
            <div className="w-full max-w-4xl flex items-center justify-between mb-4 pb-4 border-b border-border/80">
              <span className="text-body-xs font-mono text-muted-foreground uppercase tracking-wider">
                Mode Membaca Artikel
              </span>
              <div className="flex items-center gap-1.5 bg-card/80 p-1 rounded-md border border-border shadow-2xs">
                {(["light", "sepia", "cream", "dark"] as ThemeMode[]).map((tMode) => (
                  <button
                    key={tMode}
                    onClick={() => handleThemeChange(tMode)}
                    className={cn(
                      "text-[10px] font-semibold px-2.5 py-1 rounded-md transition-all",
                      theme === tMode 
                        ? "bg-brand-primary text-white shadow-xs" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tMode.charAt(0).toUpperCase() + tMode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Styled Article Paper */}
            <div className={cn(
              "rounded-2xl border p-8 md:p-12 shadow-sm leading-relaxed max-w-4xl w-full transition-colors duration-300 font-sans",
              currentThemeStyle.paperBg,
              currentThemeStyle.text,
              currentThemeStyle.border
            )}>
              <MarkdownRenderer content={material.body} />
            </div>
          </div>
        ) : null}

        {/* Image Reader */}
        {material.kind === "image" && material.url ? (
          <div className="relative mx-auto max-w-2xl aspect-video w-full rounded-2xl overflow-hidden shadow-md bg-card/60 p-2 my-4">
            <div className="relative w-full h-full rounded-xl overflow-hidden">
              <Image
                src={material.url}
                alt={material.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 42rem"
              />
            </div>
          </div>
        ) : null}

        {/* Video Player */}
        {material.kind === "video" && material.url ? (
          <div className="space-y-4 max-w-3xl mx-auto p-4 my-2">
            {(() => {
              const embed = getYoutubeEmbedUrl(material.url);
              if (embed) {
                return (
                  <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border shadow-md">
                    <iframe
                      title={material.title}
                      src={embed}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                );
              }
              return (
                <p className="text-body-base text-muted-foreground">
                  Video tidak didukung untuk sematan langsung. Buka di tab baru.
                </p>
              );
            })()}
          </div>
        ) : null}

        {/* External Link */}
        {material.kind === "link" && material.url ? (
          <div className="bg-card p-8 rounded-2xl border border-border flex flex-col sm:flex-row items-center justify-between gap-4 max-w-2xl mx-auto my-6 shadow-2xs">
            <p className="text-body-sm text-muted-foreground text-center sm:text-left">
              Dokumen eksternal berada di luar platform Zyx.
            </p>
            <Button asChild className="bg-brand-primary text-white hover:bg-brand-primary/95 shrink-0">
              <a href={material.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 size-4" />
                Buka Tautan Sumber
              </a>
            </Button>
          </div>
        ) : null}

      </div>
    </div>
  );
}
