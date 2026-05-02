"use client";

import { useState } from "react";
import { BookOpen, Check, ClipboardList, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionContainer } from "@/components/layout/section-container";
import { SectionHeading } from "@/components/ui/section-heading";

const steps = [
  {
    id: "assign",
    label: "Tugaskan latihan",
    short: "Per topik, sesuai ritme kelas",
    icon: ClipboardList,
    sidebar: ["Semester 1", "Semester 2", "TPB intensif"],
    activeSidebar: 1,
    cards: [
      { code: "MA1101", title: "Limit & kontinuitas", highlight: false },
      { code: "MA1101", title: "Turunan — aplikasi grafik", highlight: true },
      { code: "MA1101", title: "Integral tak tentu", highlight: false },
    ],
    laneEyebrow: "Aktivitas mendatang",
    laneRows: [
      { left: "Sen", right: "Kuis limit · 15 soal" },
      { left: "Rab", right: "Set turunan bergambar" },
      { left: "Jum", right: "Review gabungan mingguan" },
    ],
    laneBars: [72, 55, 88],
    previewTitle: "Soal singkat",
    previewBody: "Diberikan f(x) = 2x + 1, tentukan f′(x).",
    previewAnswer: "2",
  },
  {
    id: "guide",
    label: "Bimbingan saat salah",
    short: "Hint dan penjelasan bertahap",
    icon: BookOpen,
    sidebar: ["Kalkulus", "Fisika", "Kimia"],
    activeSidebar: 0,
    cards: [
      { code: "Hint", title: "Identifikasi pola turunan pangkat", highlight: true },
      { code: "Contoh", title: "x³ → 3x²", highlight: false },
      { code: "Latihan", title: "Ulangi dengan koefisien", highlight: false },
    ],
    laneEyebrow: "Urutan pembahasan",
    laneRows: [
      { left: "1", right: "Cek pola dan rumus dasar" },
      { left: "2", right: "Contoh sejenis satu langkah" },
      { left: "3", right: "Coba lagi dengan variasi koefisien" },
    ],
    laneBars: [92, 64, 40],
    previewTitle: "Penjelasan tutor",
    previewBody: "Turunan axⁿ adalah n·axⁿ⁻¹. Konstanta menghilang.",
    previewAnswer: "Cek langkahmu",
  },
  {
    id: "track",
    label: "Pantau penguasaan",
    short: "Skor dan pola belajar",
    icon: LineChart,
    sidebar: ["Minggu ini", "Bulan ini", "Semester"],
    activeSidebar: 0,
    cards: [
      { code: "Kuis 3", title: "Integral substitusi — 82%", highlight: false },
      { code: "Tryout", title: "Campuran TPB — 74%", highlight: true },
      { code: "Esai", title: "Umpan balik tutor", highlight: false },
    ],
    laneEyebrow: "Ikhtisar minggu ini",
    laneRows: [
      { left: "Kuis", right: "Konsisten di atas rata-rata kelas" },
      { left: "Tryout", right: "Perlu pemantapan turunan aplikasi" },
      { left: "Esai", right: "Umpan balik tutor dibaca lengkap" },
    ],
    laneBars: [84, 58, 70],
    previewTitle: "Ringkasan progres",
    previewBody: "Kekuatan: integral dasar. Fokus: aplikasi turunan.",
    previewAnswer: "Lanjut 3 modul",
  },
] as const;

function PreviewDetailLane({
  eyebrow,
  rows,
  bars,
}: {
  eyebrow: string;
  rows: readonly { readonly left: string; readonly right: string }[];
  bars: readonly number[];
}) {
  return (
    <div className="flex h-full min-h-[200px] flex-col rounded-2xl border border-border bg-linear-to-br from-muted/45 via-background to-muted/20 p-4 shadow-inner md:min-h-[228px] md:p-5">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(148px,40%)] md:items-start md:gap-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">{eyebrow}</p>
          <ul className="mt-3 space-y-3">
            {rows.map((row) => (
              <li
                key={row.right}
                className="flex gap-4 border-l-2 border-[var(--zx-accent)]/35 py-0.5 pl-4 text-body-sm leading-snug"
              >
                <span className="w-14 shrink-0 font-semibold tabular-nums text-[var(--zx-accent)]">{row.left}</span>
                <span className="text-foreground">{row.right}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex min-h-36 items-end justify-center gap-2 rounded-xl border border-border/80 bg-card/70 px-3 py-3 shadow-sm sm:gap-4 md:min-h-40">
          {rows.map((row, i) => (
            <div key={row.right} className="flex min-w-0 max-w-17 flex-1 flex-col items-center gap-2">
              <div className="relative h-24 w-full overflow-hidden rounded-lg bg-muted/90 sm:h-28">
                <div
                  className="absolute bottom-0 left-1 right-1 rounded-md bg-linear-to-t from-primary/90 to-primary/55"
                  style={{ height: `${bars[i]}%` }}
                  aria-hidden
                />
              </div>
              <span className="truncate text-[11px] font-semibold text-muted-foreground sm:text-xs">{row.left}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LandingHowItWorks() {
  const [active, setActive] = useState(0);
  const step = steps[active];

  return (
    <SectionContainer
      density="compact"
      className="border-b border-border bg-[var(--color-surface)] py-10 md:py-14"
      aria-labelledby="how-heading"
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--zx-accent)]">Alur di dashboard</p>
        <SectionHeading id="how-heading" tier="primary" className="mt-2 text-foreground">
          Tiga langkah belajar
        </SectionHeading>
        <p className="mt-3 max-w-prose text-body-md text-muted-foreground">
          Penugasan, bimbingan, lalu gambaran progres — dalam satu alur dashboard.
        </p>
      </div>

      <div
        className="mx-auto mt-5 w-full max-w-6xl sm:mt-6"
        role="radiogroup"
        aria-label="Alur langkah belajar"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const selected = idx === active;
            const stepNum = idx + 1;

            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-current={selected ? "step" : undefined}
                id={`how-step-${s.id}`}
                aria-controls={`how-panel-${s.id}`}
                onClick={() => setActive(idx)}
                className={cn(
                  "interactive flex w-full flex-col items-center gap-2.5 rounded-2xl border px-4 py-4 text-center shadow-sm transition-[box-shadow,border-color,background-color] sm:min-h-[10.25rem] sm:gap-3 sm:py-5",
                  selected
                    ? "border-[var(--zx-accent)] bg-card ring-2 ring-[var(--zx-accent)]/30"
                    : "border-border bg-card/90 hover:border-[var(--zx-accent)]/40 hover:bg-card hover:shadow-md",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums",
                      selected
                        ? "bg-[var(--zx-accent)] text-white"
                        : "border-2 border-[var(--zx-accent)]/55 bg-background text-[var(--zx-accent)]",
                    )}
                    aria-hidden
                  >
                    {stepNum}
                  </span>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Icon className="size-5" aria-hidden strokeWidth={1.85} />
                  </span>
                </div>
                <div className="min-w-0 px-0.5">
                  <span className="block font-heading text-body-base font-semibold text-foreground">{s.label}</span>
                  <span className="mt-1.5 block text-body-sm leading-snug text-muted-foreground">{s.short}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="relative mx-auto mt-6 w-full max-w-6xl border-t border-border/80 pt-6 sm:mt-8 sm:pt-7 md:pt-8"
        role="tabpanel"
        id={`how-panel-${step.id}`}
        aria-labelledby={`how-step-${step.id}`}
      >
        <div className="overflow-hidden rounded-2xl border border-border bg-background p-4 shadow-md ring-1 ring-black/5 md:p-5">
          <div className="relative grid gap-4 md:grid-cols-[minmax(0,11rem)_1fr] md:gap-6">
          <aside className="flex min-w-0 flex-col gap-2">
            {step.sidebar.map((label, i) => (
              <span
                key={label}
                className={cn(
                  "rounded-xl border px-3 py-2 text-center text-body-sm font-semibold md:text-left",
                  i === step.activeSidebar
                    ? "border-[var(--zx-accent)] bg-[var(--zx-accent)]/12 font-semibold text-foreground shadow-sm ring-1 ring-[var(--zx-accent)]/35"
                    : "border-border bg-background text-muted-foreground",
                )}
              >
                {label}
              </span>
            ))}
            <div className="mt-1 rounded-xl border border-border bg-muted/50 p-3 text-body-sm text-muted-foreground">
              <p className="font-medium text-foreground">Satu alur</p>
              <p className="mt-1 leading-relaxed">Modul dan latihan mengikuti silabus umum &amp; kebutuhanmu.</p>
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-col gap-4">
            <div className="grid min-w-0 gap-3 sm:grid-cols-3">
              {step.cards.map((c) => (
                <div
                  key={c.title}
                  className={cn(
                    "min-w-0 rounded-2xl border bg-background p-3 shadow-sm sm:p-4",
                    c.highlight ? "border-[var(--zx-accent)] ring-2 ring-[var(--zx-accent)]/30" : "border-border",
                  )}
                >
                  <p className="text-body-sm font-semibold text-[var(--zx-accent)]">{c.code}</p>
                  <p className="mt-1 font-heading text-body-base font-semibold text-foreground">{c.title}</p>
                  {c.highlight ? (
                    <p className="mt-2 text-body-sm font-medium text-[var(--zx-accent)]">Fokus latihan</p>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="grid min-w-0 gap-3 lg:grid-cols-2 lg:items-stretch lg:gap-4">
              <PreviewDetailLane eyebrow={step.laneEyebrow} rows={step.laneRows} bars={step.laneBars} />
              <div className="relative flex min-h-[200px] min-w-0 flex-col rounded-2xl border border-border border-t-[3px] border-t-[var(--zx-accent)] bg-linear-to-br from-card to-muted/25 p-4 shadow-lg ring-1 ring-black/6 md:min-h-[228px] md:p-5">
                <div className="pointer-events-none absolute -left-1.5 -top-1.5 flex items-start gap-1">
                  <span className="mt-1 inline-block size-0 border-r-[10px] border-t-[6px] border-b-[6px] border-r-[var(--zx-accent)] border-t-transparent border-b-transparent" />
                  <span className="rounded-md bg-[var(--zx-accent)] px-2.5 py-0.5 text-body-sm font-semibold text-white shadow">
                    Tutor
                  </span>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {["Ringan", "Sedang", "Berat"].map((d, i) => (
                    <span
                      key={d}
                      className={cn(
                        "rounded-full px-3 py-1 text-body-sm font-medium",
                        i === 1 ? "bg-status-success text-white" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {d}
                    </span>
                  ))}
                </div>
                <p className="mt-4 font-heading text-body-base font-semibold text-foreground">{step.previewTitle}</p>
                <p className="mt-2 flex-1 text-body-sm leading-relaxed text-muted-foreground">{step.previewBody}</p>
                <div className="mt-auto flex items-center gap-2 rounded-xl border border-border/80 bg-background/90 px-3 py-2.5 text-body-sm font-semibold text-foreground shadow-inner">
                  <Check className="size-4 shrink-0 text-status-success" strokeWidth={2.5} aria-hidden />
                  {step.previewAnswer}
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </SectionContainer>
  );
}
