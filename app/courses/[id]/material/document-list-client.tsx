"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  LayoutGrid,
  List,
  Sliders,
  Search,
  BookOpen,
  HelpCircle,
  FileCode,
  Download,
  ExternalLink,
  ChevronRight,
  Archive
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CourseMaterial, DocCategory } from "@/lib/student-course-fixtures";

type DocumentListClientProps = {
  courseId: string;
  materials: CourseMaterial[];
};

const categoryLabel: Record<string, string> = {
  materi: "Materi Kuliah",
  soal: "Soal Ujian ITB",
  solusi: "Solusi Ujian",
  diktat: "Diktat & Modul",
};

export function DocumentListClient({ courseId, materials }: DocumentListClientProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sizeLevel, setSizeLevel] = useState<number>(2); // 1 = S, 2 = M, 3 = L, 4 = XL
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filteredMaterials = materials.filter((m) => {
    // Filter by tab
    if (activeTab !== "all" && m.docCategory !== activeTab) {
      return false;
    }
    // Filter by search
    if (search && !m.title.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Icon selector based on category
  const getFileIcon = (cat?: DocCategory, sizeClass?: string) => {
    const cls = cn("text-rose-500 shrink-0", sizeClass);
    if (cat === "soal") return <FileText className={cls} />;
    if (cat === "solusi") return <FileCode className={cls} />;
    if (cat === "diktat") return <Archive className={cls} />;
    return <BookOpen className={cls} />;
  };

  // Grid styling dynamic maps based on Size Level
  const gridContainerClass = {
    1: "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3",
    2: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4",
    3: "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5",
    4: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6",
  }[sizeLevel];

  const gridCardClass = {
    1: "p-3 flex flex-col items-center text-center text-body-xs rounded-xl",
    2: "p-4 flex flex-col items-start text-left rounded-2xl",
    3: "p-5 flex flex-col items-start text-left rounded-2xl min-h-[160px]",
    4: "p-6 flex flex-col items-start text-left rounded-3xl min-h-[200px]",
  }[sizeLevel];

  const gridIconSize = {
    1: "size-8 mb-2",
    2: "size-10 mb-3",
    3: "size-12 mb-4",
    4: "size-16 mb-5",
  }[sizeLevel];

  // List styling dynamic maps based on Size Level
  const listRowClass = {
    1: "py-2 px-3 gap-3 rounded-lg text-body-xs",
    2: "py-3.5 px-4 gap-4 rounded-xl text-body-sm",
    3: "py-5 px-5 gap-5 rounded-2xl text-body-base",
    4: "py-7 px-6 gap-6 rounded-2xl text-body-lg",
  }[sizeLevel];

  const listIconSize = {
    1: "size-4",
    2: "size-6",
    3: "size-8",
    4: "size-11",
  }[sizeLevel];

  return (
    <div className="space-y-6 font-sans">
      
      {/* File Explorer Controls bar */}
      <div className="flex flex-col gap-4 p-4 rounded-2xl border border-border bg-card/60 backdrop-blur-xs">
        
        {/* Upper Controls: Search & Tabs */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari berkas dokumen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2 text-body-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
          </div>

          {/* Explorer sizing slider and view modes toggles */}
          <div className="flex items-center gap-4 self-end lg:self-auto">
            
            {/* Explorer size slider */}
            <div className="flex items-center gap-2 border-r border-border pr-4">
              <Sliders className="size-3.5 text-muted-foreground" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Ukuran:</span>
              <input
                type="range"
                min="1"
                max="4"
                step="1"
                value={sizeLevel}
                onChange={(e) => setSizeLevel(parseInt(e.target.value))}
                className="w-20 accent-brand-primary h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                title="Sesuaikan Ukuran Ikon"
              />
              <span className="font-mono text-[10px] font-bold text-muted-foreground w-6 text-center uppercase">
                {["S", "M", "L", "XL"][sizeLevel - 1]}
              </span>
            </div>

            {/* Layout switchers */}
            <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/85">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1 rounded-md transition-colors",
                  viewMode === "grid"
                    ? "bg-card text-brand-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Tampilan Kotak (Grid)"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1 rounded-md transition-colors",
                  viewMode === "list"
                    ? "bg-card text-brand-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Tampilan Daftar (List)"
              >
                <List className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Lower Controls: Tabs Category selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-t border-border/70 pt-3">
          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "rounded-full px-4 py-1.5 text-body-xs font-semibold transition-colors shrink-0",
              activeTab === "all"
                ? "bg-brand-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-border hover:text-foreground"
            )}
          >
            Semua Dokumen
          </button>
          {["materi", "soal", "solusi", "diktat"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={cn(
                "rounded-full px-4 py-1.5 text-body-xs font-semibold transition-colors shrink-0 uppercase",
                activeTab === cat
                  ? "bg-brand-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-border"
              )}
            >
              {categoryLabel[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* RENDER MODE 1: GRID VIEW EXPLORER */}
      {viewMode === "grid" ? (
        <div className={gridContainerClass}>
          {filteredMaterials.map((m) => (
            <Link
              key={m.id}
              href={`/courses/${courseId}/material/${m.id}`}
              className={cn(
                "group border border-border/80 bg-card hover:border-brand-primary hover:shadow-md transition-all flex flex-col justify-between overflow-hidden",
                gridCardClass
              )}
            >
              {/* Card top */}
              <div className="w-full flex flex-col items-center text-center">
                {getFileIcon(m.docCategory, gridIconSize)}
                
                {/* File Title */}
                <h3 className={cn(
                  "font-heading font-bold text-foreground leading-snug group-hover:text-brand-primary transition-colors text-ellipsis overflow-hidden w-full",
                  sizeLevel === 1 ? "line-clamp-1" : "line-clamp-2"
                )}>
                  {m.title}
                </h3>
              </div>

              {/* Card bottom details (hidden in Small grid mode for clean aesthetic) */}
              {sizeLevel > 1 && (
                <div className="w-full mt-3 pt-3 border-t border-border/50 text-[10px] text-muted-foreground flex justify-between items-center">
                  <span className="uppercase font-semibold tracking-wider text-brand-primary/80">
                    {m.docCategory || "Materi"}
                  </span>
                  <span>
                    {m.fileSize || "PDF"}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        /* RENDER MODE 2: LIST VIEW EXPLORER */
        <div className="space-y-2">
          {/* List Headers (only for Medium to XL list) */}
          {sizeLevel > 1 && (
            <div className="grid grid-cols-12 gap-4 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-6">Nama Dokumen</div>
              <div className="col-span-3 text-center">Kategori</div>
              <div className="col-span-2">Ukuran Berkas</div>
              <div className="col-span-1 text-right">Aksi</div>
            </div>
          )}

          <ul className="space-y-1.5">
            {filteredMaterials.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/courses/${courseId}/material/${m.id}`}
                  className={cn(
                    "flex items-center justify-between border border-border/70 bg-card hover:border-brand-primary hover:shadow-xs transition-all",
                    listRowClass
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {getFileIcon(m.docCategory, listIconSize)}
                    <div className="truncate min-w-0">
                      <span className="font-heading font-bold text-foreground group-hover:text-brand-primary block truncate">
                        {m.title}
                      </span>
                      {sizeLevel === 1 && (
                        <span className="text-[9px] text-muted-foreground uppercase mt-0.5 block">
                          {m.docCategory || "materi"} • {m.fileSize}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Columns for larger sizes */}
                  {sizeLevel > 1 && (
                    <div className="hidden md:grid md:grid-cols-6 gap-4 flex-1 items-center max-w-xl text-body-xs text-muted-foreground">
                      <div className="col-span-3 text-center">
                        <span className="inline-flex rounded-full bg-muted/80 px-2 py-0.5 font-semibold text-foreground ring-1 ring-border/60 uppercase">
                          {m.docCategory ? categoryLabel[m.docCategory] : "Materi"}
                        </span>
                      </div>
                      <div className="col-span-2 font-medium">
                        {m.fileSize || "1.2 MB"}
                      </div>
                      <div className="col-span-1 text-right text-brand-primary font-bold">
                        Buka
                      </div>
                    </div>
                  )}

                  <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-60 ml-2" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {filteredMaterials.length === 0 ? (
        <div className="text-center py-16 rounded-3xl border border-dashed border-border bg-muted/15">
          <p className="text-body-md text-muted-foreground">Tidak ditemukan dokumen yang cocok dengan pencarian.</p>
        </div>
      ) : null}
    </div>
  );
}
