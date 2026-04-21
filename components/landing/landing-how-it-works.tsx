"use client";

import { useState } from "react";
import { BookOpen, Check, ClipboardList, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionContainer } from "@/components/layout/section-container";
import { SectionHeading } from "@/components/ui/section-heading";
import { StepCard } from "@/components/ui/step-card";

const steps = [
  {
    id: "assign",
    label: "Tugaskan latihan",
    short: "Latihan terarah per topik",
    icon: ClipboardList,
    sidebar: ["Semester 1", "Semester 2", "TPB intensif"],
    activeSidebar: 1,
    cards: [
      { code: "MA1101", title: "Limit & kontinuitas", highlight: false },
      { code: "MA1101", title: "Turunan — aplikasi grafik", highlight: true },
      { code: "MA1101", title: "Integral tak tentu", highlight: false },
    ],
    previewTitle: "Soal singkat",
    previewBody: "Diberikan f(x) = 2x + 1, tentukan f′(x).",
    previewAnswer: "2",
  },
  {
    id: "guide",
    label: "Bimbingan saat salah",
    short: "Umpan balik langkah demi langkah",
    icon: BookOpen,
    sidebar: ["Kalkulus", "Fisika", "Kimia"],
    activeSidebar: 0,
    cards: [
      { code: "Hint", title: "Identifikasi pola turunan pangkat", highlight: true },
      { code: "Contoh", title: "x³ → 3x²", highlight: false },
      { code: "Latihan", title: "Ulangi dengan koefisien", highlight: false },
    ],
    previewTitle: "Penjelasan tutor",
    previewBody: "Turunan axⁿ adalah n·axⁿ⁻¹. Konstanta menghilang.",
    previewAnswer: "Cek langkahmu",
  },
  {
    id: "track",
    label: "Pantau penguasaan",
    short: "Skor & konsistensi mingguan",
    icon: LineChart,
    sidebar: ["Minggu ini", "Bulan ini", "Semester"],
    activeSidebar: 0,
    cards: [
      { code: "Kuis 3", title: "Integral substitusi — 82%", highlight: false },
      { code: "Tryout", title: "Campuran TPB — 74%", highlight: true },
      { code: "Esai", title: "Umpan balik tutor", highlight: false },
    ],
    previewTitle: "Ringkasan progres",
    previewBody: "Kekuatan: integral dasar. Fokus: aplikasi turunan.",
    previewAnswer: "Lanjut 3 modul",
  },
] as const;

export function LandingHowItWorks() {
  const [active, setActive] = useState(0);
  const step = steps[active];

  return (
    <SectionContainer className="border-b border-border bg-muted" aria-labelledby="how-heading">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading id="how-heading" tier="secondary" className="text-foreground">
            Cara kerja dalam tiga langkah
          </SectionHeading>
          <p className="mt-3 max-w-prose text-body-md text-muted-foreground">
            Dari penugasan hingga gambaran penguasaan — tetap satu alur di dashboard Zyx.
          </p>
        </div>

        <div
          className="mt-10 flex flex-col gap-3 md:mt-12 md:flex-row md:justify-center md:gap-2"
          role="tablist"
          aria-label="Langkah cara kerja"
        >
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const selected = idx === active;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={selected}
                id={`how-tab-${s.id}`}
                aria-controls={`how-panel-${s.id}`}
                onClick={() => setActive(idx)}
                onMouseEnter={() => setActive(idx)}
                onMouseLeave={() => setActive(0)}
                className="flex flex-1 items-center gap-3 md:max-w-xs md:flex-none"
              >
                <StepCard state={selected ? "active" : "default"} className="flex w-full items-center">
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full",
                      selected ? "bg-primary/15 text-primary" : "bg-primary/10 text-primary"
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="ml-3 min-w-0">
                    <span className="block font-heading text-body-base font-semibold text-foreground">{s.label}</span>
                    <span className="block text-body-sm text-muted-foreground">{s.short}</span>
                  </span>
                </StepCard>
              </button>
            );
          })}
        </div>
        <div className="mx-auto my-2 h-8 w-px bg-border" />

        <div
          className="relative mt-8 overflow-hidden rounded-3xl border border-border bg-background p-4 md:p-6"
          role="tabpanel"
          id={`how-panel-${step.id}`}
          aria-labelledby={`how-tab-${step.id}`}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35] bg-blueprint-grid"
            aria-hidden
          />
          <div className="relative grid gap-4 md:grid-cols-[11rem_1fr] md:gap-6">
            <aside className="flex flex-col gap-2">
              {step.sidebar.map((label, i) => (
                <span
                  key={label}
                  className={cn(
                    "rounded-xl px-3 py-2 text-center text-body-sm font-semibold md:text-left",
                    i === step.activeSidebar
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              ))}
              <div className="mt-2 rounded-xl border border-border bg-card p-3 text-body-sm text-muted-foreground">
                <p className="font-medium text-card-foreground">Partner materi</p>
                <p className="mt-1">Modul mengikuti silabus umum kampus &amp; latihan adaptif.</p>
              </div>
            </aside>

            <div className="relative min-h-[280px]">
              <div className="grid gap-3 sm:grid-cols-3">
                {step.cards.map((c) => (
                  <div
                    key={c.title}
                    className={cn(
                      "rounded-2xl border bg-card p-3 shadow-sm",
                      c.highlight ? "border-primary ring-2 ring-primary/30" : "border-border"
                    )}
                  >
                    <p className="text-body-sm font-semibold text-primary">{c.code}</p>
                    <p className="mt-1 font-heading text-body-base font-semibold text-card-foreground">{c.title}</p>
                    {c.highlight ? (
                      <p className="mt-2 text-body-sm font-medium text-primary">Assign latihan</p>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="absolute right-0 bottom-0 w-full max-w-[280px] rounded-2xl border border-border border-t-2 border-t-primary bg-card p-4 shadow-lg transition-all duration-200 ease-in-out sm:right-2 sm:bottom-2">
                <div className="mb-2 flex gap-2">
                  {["Ringan", "Sedang", "Berat"].map((d, i) => (
                    <span
                      key={d}
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-body-sm font-medium",
                        i === 1 ? "bg-status-success text-white" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {d}
                    </span>
                  ))}
                </div>
                <p className="font-heading text-body-sm font-semibold text-card-foreground">{step.previewTitle}</p>
                <p className="mt-2 text-body-sm text-muted-foreground">{step.previewBody}</p>
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/80 px-2 py-1.5 text-body-sm font-medium text-foreground">
                  <Check className="size-4 shrink-0 text-status-success" strokeWidth={2.5} aria-hidden />
                  {step.previewAnswer}
                </div>
                <div className="pointer-events-none absolute -left-3 -top-3 flex items-start gap-1">
                  <span className="mt-1 inline-block size-0 border-r-[10px] border-t-[6px] border-b-[6px] border-r-primary border-t-transparent border-b-transparent" />
                  <span className="rounded-md bg-primary px-2 py-0.5 text-body-sm font-semibold text-primary-foreground shadow">
                    Tutor
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
    </SectionContainer>
  );
}
