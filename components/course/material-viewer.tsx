"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Download, ExternalLink, ZoomIn, ZoomOut, Maximize2, Minimize2, ChevronLeft, ChevronRight, Monitor, Settings, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getYoutubeEmbedUrl } from "@/lib/youtube";
import type { CourseMaterial } from "@/lib/student-course-fixtures";
import { updateMaterialProgress } from "@/app/dashboard/actions";
import { cn } from "@/lib/utils";

type MaterialViewerProps = {
  material: CourseMaterial;
};

// Mock academic PDF contents representing an ITB Calculus exam / e-book
const MOCK_PAGES = [
  {
    pageNum: 1,
    title: "HALAMAN 1: HALAMAN JUDUL & INFORMASI UMUM",
    content: (
      <div className="space-y-6 text-center py-10">
        <div className="mx-auto size-20 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4 font-bold text-h4">ITB</div>
        <h2 className="font-heading text-h4 font-bold text-foreground">UJIAN TENGAH SEMESTER (UTS) II</h2>
        <h3 className="font-heading text-h5 font-semibold text-muted-foreground">MA1101 KALKULUS I</h3>
        <p className="text-body-sm text-muted-foreground max-w-md mx-auto pt-4 border-t border-border">
          Fakultas Matematika dan Ilmu Pengetahuan Alam (FMIPA)<br />
          Institut Teknologi Bandung
        </p>
        <div className="mt-8 rounded-xl bg-muted/50 p-4 inline-block text-left text-body-xs font-mono">
          <div>Tahun Akademik: 2024/2025</div>
          <div>Durasi Ujian: 120 Menit</div>
          <div>Sifat Ujian: Tutup Buku (Closed Book)</div>
        </div>
      </div>
    )
  },
  {
    pageNum: 2,
    title: "HALAMAN 2: LIMIT DAN KEKONTINUAN FUNGSI",
    content: (
      <div className="space-y-4 text-left">
        <h3 className="font-heading text-body-md font-bold text-rose-500 border-b border-border pb-1">1. Limit Fungsi Secara Intuitif</h3>
        <p className="text-body-sm text-muted-foreground leading-relaxed">
          Mengatakan bahwa lim x → c f(x) = L berarti bahwa bilamana x dekat tetapi berbeda dari c, maka f(x) dekat ke L.
        </p>
        
        <h4 className="font-semibold text-body-sm mt-3">Teorema Limit Utama:</h4>
        <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-2 text-body-xs font-mono leading-relaxed">
          <div>1. lim x → c k = k</div>
          <div>2. lim x → c x = c</div>
          <div>3. lim x → c [k · f(x)] = k · lim x → c f(x)</div>
          <div>4. lim x → c [f(x) ± g(x)] = lim x → c f(x) ± lim x → c g(x)</div>
        </div>

        <div className="p-3 bg-brand-primary/5 rounded-xl border border-brand-primary/10 text-body-xs leading-relaxed mt-4">
          <b>Definisi Presisi (Limit ε-δ):</b><br />
          lim x → c f(x) = L berarti bahwa untuk setiap ε &gt; 0, terdapat δ &gt; 0 sedemikian rupa sehingga: 0 &lt; |x - c| &lt; δ → |f(x) - L| &lt; ε.
        </div>
      </div>
    )
  },
  {
    pageNum: 3,
    title: "HALAMAN 3: ATURAN TURUNAN & TURUNAN TRIGONOMETRI",
    content: (
      <div className="space-y-4 text-left">
        <h3 className="font-heading text-body-md font-bold text-rose-500 border-b border-border pb-1">2. Turunan Fungsi (Diferensial)</h3>
        <p className="text-body-sm text-muted-foreground leading-relaxed">
          Turunan fungsi f di titik x dinyatakan dengan f&apos;(x), yang menyatakan laju perubahan nilai fungsi di titik tersebut.
        </p>

        <h4 className="font-semibold text-body-sm mt-3">Aturan-Aturan Turunan Dasar:</h4>
        <div className="grid grid-cols-2 gap-3 text-body-xs font-mono">
          <div className="bg-muted/40 p-3 rounded-lg border border-border">
            <b>Aturan Pangkat:</b><br />
            d/dx (xⁿ) = n·xⁿ⁻¹
          </div>
          <div className="bg-muted/40 p-3 rounded-lg border border-border">
            <b>Aturan Perkalian:</b><br />
            d/dx (u·v) = u&apos;v + uv&apos;
          </div>
          <div className="bg-muted/40 p-3 rounded-lg border border-border">
            <b>Aturan Pembagian:</b><br />
            d/dx (u/v) = (u&apos;v - uv&apos;) / v²
          </div>
          <div className="bg-muted/40 p-3 rounded-lg border border-border">
            <b>Aturan Rantai:</b><br />
            d/dx (f(g(x))) = f&apos;(g(x))·g&apos;(x)
          </div>
        </div>

        <h4 className="font-semibold text-body-sm mt-3">Turunan Fungsi Trigonometri:</h4>
        <ul className="list-disc pl-5 text-body-xs text-muted-foreground space-y-1 font-mono">
          <li>d/dx (sin x) = cos x</li>
          <li>d/dx (cos x) = -sin x</li>
          <li>d/dx (tan x) = sec² x</li>
        </ul>
      </div>
    )
  },
  {
    pageNum: 4,
    title: "HALAMAN 4: LATIHAN SOAL MANDIRI ITB",
    content: (
      <div className="space-y-4 text-left">
        <h3 className="font-heading text-body-md font-bold text-rose-500 border-b border-border pb-1">3. Latihan Soal Evaluatif</h3>
        
        <div className="space-y-3">
          <div className="p-3 bg-muted/30 border border-border rounded-xl">
            <span className="font-semibold text-body-xs text-brand-primary block">Soal 1:</span>
            <p className="text-body-sm text-foreground mt-1">
              Tentukanlah nilai limit berikut ini:<br />
              <b>lim x → 0 (cos(4x) - 1) / (x · tan(2x))</b>
            </p>
          </div>

          <div className="p-3 bg-muted/30 border border-border rounded-xl">
            <span className="font-semibold text-body-xs text-brand-primary block">Soal 2:</span>
            <p className="text-body-sm text-foreground mt-1">
              Diberikan f(x) = x³ - 3x² - 9x + 5. Cari interval di mana fungsi tersebut naik dan interval di mana fungsi tersebut turun!
            </p>
          </div>

          <div className="p-3 bg-muted/30 border border-border rounded-xl">
            <span className="font-semibold text-body-xs text-brand-primary block">Soal 3 (Analitis):</span>
            <p className="text-body-sm text-foreground mt-1">
              Tunjukkan menggunakan definisi ε-δ bahwa limit x → 2 dari (3x - 1) adalah 5!
            </p>
          </div>
        </div>
      </div>
    )
  }
];

export function MaterialViewer({ material }: MaterialViewerProps) {
  const [done, setDone] = useState(material.completed);
  const [viewerType, setViewerType] = useState<"custom" | "chrome">("custom");
  const [page, setPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(100); // Percentage zoom
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const viewerRef = useRef<HTMLDivElement>(null);

  // Set document as in progress on mount
  useEffect(() => {
    updateMaterialProgress(material.id, "in_progress").catch((err) =>
      console.error("Error updating progress to in_progress:", err)
    );
  }, [material.id]);

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

  // Handle Fullscreen toggle
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

  // Monitor browser exit-fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const openUrl = material.url ?? "#";

  return (
    <div className="space-y-6 font-sans">
      
      {/* Viewer controls */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        
        {/* Toggle Custom Viewer / Chrome native Viewer */}
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
              <Settings className="size-3.5" />
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
            className="rounded-full bg-brand-primary text-white hover:bg-brand-primary/95 text-body-xs py-1 h-auto"
          >
            {done ? "Selesai Pelajari" : "Tandai Selesai"}
          </Button>
          {material.url && material.kind !== "article" ? (
            <Button asChild variant="outline" className="rounded-full text-body-xs py-1 h-auto">
              <a href={openUrl} target="_blank" rel="noopener noreferrer">
                Buka Berkas Asli
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Main Material Display box */}
      <div className="rounded-3xl border border-border/80 bg-muted/20 p-4 shadow-sm relative">
        
        {/* Render PDF Document (Integrated custom viewer or standard Chrome) */}
        {material.kind === "pdf" ? (
          viewerType === "custom" ? (
            
            /* Custom minimalist integrated PDF viewer shell */
            <div
              ref={viewerRef}
              className={cn(
                "flex flex-col bg-[#2e3135] border border-black/30 overflow-hidden shadow-xl rounded-2xl w-full select-none",
                isFullscreen ? "fixed inset-0 z-50 rounded-none w-screen h-screen" : "min-h-[500px]"
              )}
            >
              
              {/* PDF Toolbar */}
              <div className="bg-[#1f2124] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-black/40">
                
                {/* Title */}
                <span className="text-body-xs font-bold font-mono tracking-wide truncate max-w-[200px] md:max-w-xs">
                  📄 {material.title}
                </span>

                {/* PDF Page controller */}
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="p-1 rounded bg-[#2e3135] hover:bg-[#3d4247] disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="size-4 text-white" />
                  </button>
                  <div className="flex items-center gap-1 text-body-xs font-mono font-bold">
                    <input
                      type="number"
                      min={1}
                      max={MOCK_PAGES.length}
                      value={page}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val >= 1 && val <= MOCK_PAGES.length) {
                          setPage(val);
                        }
                      }}
                      className="w-10 bg-[#2e3135] border border-black/30 text-center rounded py-0.5 text-white focus:outline-none"
                    />
                    <span>/</span>
                    <span>{MOCK_PAGES.length}</span>
                  </div>
                  <button
                    disabled={page === MOCK_PAGES.length}
                    onClick={() => setPage(page + 1)}
                    className="p-1 rounded bg-[#2e3135] hover:bg-[#3d4247] disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Halaman Selanjutnya"
                  >
                    <ChevronRight className="size-4 text-white" />
                  </button>
                </div>

                {/* Zoom controls & Fullscreen */}
                <div className="flex items-center gap-4">
                  
                  {/* Zoom */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setZoom(Math.max(50, zoom - 25))}
                      className="p-1 rounded bg-[#2e3135] hover:bg-[#3d4247]"
                      title="Perkecil (Zoom Out)"
                    >
                      <ZoomOut className="size-4" />
                    </button>
                    <span className="font-mono text-body-xs font-bold w-12 text-center select-none">
                      {zoom}%
                    </span>
                    <button
                      onClick={() => setZoom(Math.min(200, zoom + 25))}
                      className="p-1 rounded bg-[#2e3135] hover:bg-[#3d4247]"
                      title="Perbesar (Zoom In)"
                    >
                      <ZoomIn className="size-4" />
                    </button>
                  </div>

                  {/* Divider */}
                  <span className="h-4 w-px bg-white/20 hidden md:block" />

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 rounded bg-[#2e3135] hover:bg-[#3d4247]"
                      title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh (Fullscreen)"}
                    >
                      {isFullscreen ? <Minimize2 className="size-4 text-white" /> : <Maximize2 className="size-4 text-white" />}
                    </button>
                    {material.url && (
                      <a
                        href={material.url}
                        download
                        className="p-1.5 rounded bg-[#2e3135] hover:bg-[#3d4247]"
                        title="Unduh PDF asli"
                      >
                        <Download className="size-4 text-white" />
                      </a>
                    )}
                  </div>

                </div>
              </div>

              {/* PDF Viewer Canvas area */}
              <div className="flex-1 bg-[#4f5256] p-6 overflow-auto flex items-center justify-center min-h-[450px]">
                <div
                  className="bg-card border border-black/20 shadow-2xl rounded-sm p-8 transition-transform duration-200 aspect-[1/1.4] max-w-full overflow-hidden"
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: "center center",
                    width: "550px"
                  }}
                >
                  {/* Render active mock page content */}
                  <div className="h-full flex flex-col justify-between">
                    <div className="flex-1">
                      {MOCK_PAGES[page - 1]?.content}
                    </div>
                    
                    {/* Mock Page Footer */}
                    <div className="border-t border-border/80 pt-4 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                      <span>{material.title}</span>
                      <span>Halaman {page} dari {MOCK_PAGES.length}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            /* Chrome Native Browser PDF Viewer (iframe fallback) */
            <div className="space-y-4 font-sans">
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
              <Button asChild variant="outline" className="rounded-full">
                <a href={material.url} download target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 size-4" aria-hidden />
                  Unduh Dokumen PDF
                </a>
              </Button>
            </div>
          )
        ) : null}

        {/* Article Reader */}
        {material.kind === "article" && material.body ? (
          <div className="bg-card rounded-2xl border border-border/80 p-6 md:p-10 shadow-sm leading-relaxed max-w-4xl mx-auto">
            {material.body.split(/\n\n+/).map((para, i) => (
              <p key={i} className="mb-4 text-body-base leading-relaxed text-foreground last:mb-0">
                {para}
              </p>
            ))}
          </div>
        ) : null}

        {/* Image Reader */}
        {material.kind === "image" && material.url ? (
          <div className="relative mx-auto max-w-2xl aspect-video w-full rounded-2xl overflow-hidden shadow-md bg-card/60 p-2">
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
          <div className="space-y-4 max-w-3xl mx-auto">
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
          <div className="bg-card p-6 rounded-2xl border border-border flex flex-col sm:flex-row items-center justify-between gap-4 max-w-2xl mx-auto">
            <p className="text-body-sm text-muted-foreground">
              Dokumen eksternal berada di luar platform Zyx.
            </p>
            <Button asChild className="rounded-full bg-brand-primary text-white">
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
