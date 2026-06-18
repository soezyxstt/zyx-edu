"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Archive,
  BookOpen,
  ChevronRight,
  FileCode,
  FileText,
  LayoutGrid,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CourseMaterial, DocCategory } from "@/lib/student-course-fixtures";

type Chapter = {
  id: string;
  title: string;
  orderIndex: number;
};

type DocumentListClientProps = {
  courseId: string;
  materials: CourseMaterial[];
  chapters: Chapter[];
};

const categoryLabel: Record<string, string> = {
  materi: "Materi",
  soal: "Soal",
  solusi: "Solusi",
  diktat: "Diktat",
};

const categories = ["all", "materi", "soal", "solusi", "diktat"] as const;

export function DocumentListClient({ courseId, materials, chapters }: DocumentListClientProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [activeChapterId, setActiveChapterId] = useState<string>("all");

  const filteredMaterials = materials.filter((material) => {
    // 1. Filter by category
    if (activeTab !== "all" && material.docCategory !== activeTab) {
      return false;
    }

    // 2. Filter by chapter
    if (activeChapterId !== "all") {
      const materialChapterIds: string[] = Array.isArray(material.chapterIds)
        ? material.chapterIds
        : typeof material.chapterIds === "string"
        ? JSON.parse(material.chapterIds)
        : material.chapterId
        ? [material.chapterId]
        : [];
      
      if (!materialChapterIds.includes(activeChapterId)) {
        return false;
      }
    }

    return true;
  });

  const categoryCounts = materials.reduce<Record<string, number>>(
    (acc, material) => {
      const key = material.docCategory || "materi";
      acc.all += 1;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    { all: 0, materi: 0, soal: 0, solusi: 0, diktat: 0 }
  );

  const getFileIcon = (category?: DocCategory, sizeClass = "size-5") => {
    const className = cn("shrink-0 text-brand-primary", sizeClass);

    if (category === "soal") return <FileText className={className} />;
    if (category === "solusi") return <FileCode className={className} />;
    if (category === "diktat") return <Archive className={className} />;
    return <BookOpen className={className} />;
  };

  return (
    <div className="space-y-3 font-sans">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-card/70 p-3 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveTab(category)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                activeTab === category
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-border hover:text-foreground"
              )}
            >
              <span>{category === "all" ? "Semua" : categoryLabel[category]}</span>
              <span
                className={cn(
                  "text-[11px]",
                  activeTab === category ? "text-primary-foreground/80" : "text-muted-foreground"
                )}
              >
                {categoryCounts[category]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-1 border-l border-border pl-2">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={cn(
              "flex size-8 items-center justify-center rounded-md transition-colors",
              viewMode === "grid"
                ? "bg-primary/10 text-brand-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            title="Grid"
            aria-label="Tampilan grid"
            aria-pressed={viewMode === "grid"}
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={cn(
              "flex size-8 items-center justify-center rounded-md transition-colors",
              viewMode === "list"
                ? "bg-primary/10 text-brand-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            title="List"
            aria-label="Tampilan daftar"
            aria-pressed={viewMode === "list"}
          >
            <List className="size-4" />
          </button>
        </div>
      </div>

      {chapters.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 bg-card/45 border border-border/60 p-2.5 rounded-lg scrollbar-thin">
          <button
            type="button"
            onClick={() => setActiveChapterId("all")}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
              activeChapterId === "all"
                ? "bg-brand-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-border hover:text-foreground"
            )}
          >
            Semua Bab
          </button>
          {chapters.map((chapter) => (
            <button
              key={chapter.id}
              type="button"
              onClick={() => setActiveChapterId(chapter.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                activeChapterId === chapter.id
                  ? "bg-brand-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-border hover:text-foreground"
              )}
            >
              Bab {chapter.orderIndex}: {chapter.title}
            </button>
          ))}
        </div>
      )}

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredMaterials.map((material) => (
            <Link
              key={material.id}
              href={`/courses/${courseId}/material/${material.id}`}
              className="group flex min-h-24 flex-col justify-between rounded-lg border border-border/70 bg-card/75 p-3 transition-colors hover:border-brand-primary hover:bg-muted/25"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/8 ring-1 ring-primary/10">
                  {getFileIcon(material.docCategory)}
                </span>
                <h3 className="line-clamp-2 text-body-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-brand-primary">
                  {material.title}
                </h3>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="font-medium">
                  {material.docCategory ? categoryLabel[material.docCategory] : "Materi"}
                </span>
                <span>{material.fileSize || "PDF"}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <ul className="divide-y divide-border/70 rounded-lg border border-border/70 bg-card/75 backdrop-blur-sm">
            {filteredMaterials.map((material) => (
              <li key={material.id}>
                <Link
                  href={`/courses/${courseId}/material/${material.id}`}
                  className="group grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/35 md:grid-cols-[1fr_120px_84px_auto]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {getFileIcon(material.docCategory, "size-4")}
                    <div className="min-w-0">
                      <span className="block truncate text-body-sm font-semibold text-foreground group-hover:text-brand-primary">
                        {material.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground md:hidden">
                        {material.docCategory ? categoryLabel[material.docCategory] : "Materi"} -{" "}
                        {material.fileSize || "PDF"}
                      </span>
                    </div>
                  </div>
                  <span className="hidden text-xs font-medium text-muted-foreground md:block">
                    {material.docCategory ? categoryLabel[material.docCategory] : "Materi"}
                  </span>
                  <span className="hidden text-xs text-muted-foreground md:block">{material.fileSize || "PDF"}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-70 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-primary" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {filteredMaterials.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/15 py-12 text-center">
          <p className="text-body-sm text-muted-foreground">Tidak ada materi yang cocok.</p>
        </div>
      ) : null}
    </div>
  );
}
