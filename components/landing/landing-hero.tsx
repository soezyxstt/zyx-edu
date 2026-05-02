"use client";

import Link from "next/link";
import { AnimatedOrnamentCanvas } from "@/components/animated-ornament-canvas";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionContainer } from "@/components/layout/section-container";
import { MarketingHeroLoops } from "@/components/marketing-hero-loops";
import {
  calculatorExpressionDisplay,
  CalculatorExpressionBar,
  DesmosStyleGraph,
} from "@/components/landing/desmos-style-graph";

export function LandingHero() {
  return (
    <SectionContainer
      density="hero"
      className="relative overflow-hidden border-b border-border bg-background"
      contentClassName="relative z-10"
      aria-labelledby="landing-hero-heading"
    >
      <MarketingHeroLoops id="landing-home" />
      <AnimatedOrnamentCanvas
        className="opacity-45"
        variant="orbit"
        symbolSet={["pi", "sum", "int", "inf", "sqrt", "delta"]}
        particleCount={48}
        tone="light"
        waveOpacity={0.25}
        lineOpacity={0.2}
        particleOpacity={0.35}
      />
      <div className="pointer-events-none absolute inset-0 z-0 bg-linear-to-b from-transparent via-background/40 to-background/80" />

      <div className="landing-stagger grid items-center gap-10 lg:grid-cols-2 lg:gap-14 xl:gap-20 [&>*]:[animation-delay:0ms]">
        <div className="max-w-xl text-left [&>*:nth-child(1)]:[animation-delay:0ms] [&>*:nth-child(2)]:[animation-delay:60ms] [&>*:nth-child(3)]:[animation-delay:120ms] [&>*:nth-child(4)]:[animation-delay:180ms]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--zx-accent)]">
            ITB · TPB &amp; jurusan awal
          </p>
          <SectionHeading as="h1" tier="hero" id="landing-hero-heading" className="mt-3 text-foreground">
            Bimbingan yang <span className="font-bold italic text-primary">terstruktur</span>, suasana tetap ramah.
          </SectionHeading>
          <p className="mt-3 max-w-prose text-body-md text-muted-foreground">
            Materi selaras kuliah · latihan seperti ujian · tutor paham TPB dan fondasi jurusan.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild variant="marketingPrimary" size="marketing">
              <Link href="/plans">Lihat paket</Link>
            </Button>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            <span className="sr-only">Bukti sosial: </span>
            200+ mahasiswa TPB · 15 tutor ITB · 4,8★
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-lg justify-self-end lg:max-w-none">
          <div className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-linear-to-br from-primary/15 via-transparent to-[var(--zx-accent)]/12 blur-2xl" />
          <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-xl ring-1 ring-black/5 md:p-5">
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pratinjau playground</p>
            <div className="mt-3 overflow-hidden rounded-lg border border-border">
              <CalculatorExpressionBar expression={calculatorExpressionDisplay("quadratic", -0.08, 0, 2)} />
            </div>
            <DesmosStyleGraph mode="quadratic" a={-0.08} b={0} c={2} className="mt-3 w-full" />
          </div>
        </div>
      </div>
    </SectionContainer>
  );
}
