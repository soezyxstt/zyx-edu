"use client";

import Link from "next/link";
import { AnimatedOrnamentCanvas } from "@/components/animated-ornament-canvas";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionContainer } from "@/components/layout/section-container";
import { MarketingHeroLoops } from "@/components/marketing-hero-loops";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.4 4.3-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.1 0 9.8-1.9 13.4-5.1L31 33.5C29 35 26.6 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.3 5.5-6.3 7l.1.1 6.5 5C35.1 40.4 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function LandingHero() {
  return (
    <SectionContainer
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

      <div className="landing-stagger mx-auto flex max-w-3xl flex-col items-center text-center [&>*:nth-child(1)]:[animation-delay:0ms] [&>*:nth-child(2)]:[animation-delay:80ms] [&>*:nth-child(3)]:[animation-delay:140ms] [&>*:nth-child(4)]:[animation-delay:200ms]">
        <p className="text-xs tracking-widest uppercase text-muted-foreground">ITB · TPB &amp; awal jurusan</p>
        <SectionHeading as="h1" tier="hero" id="landing-hero-heading" className="text-foreground">
          Bimbingan yang <span className="font-bold italic text-primary">terstruktur</span>
          <br />
          suasana tetap ramah.
        </SectionHeading>
        <p className="max-w-prose text-body-md text-muted-foreground md:text-body-lg">
          Materi selaras kampus, latihan mirip ujian, tutor yang paham ritme TPB dan fondasi jurusan.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild size="lg" variant="default" className="interactive hover:scale-[1.02] active:scale-[0.98]">
            <Link href="/plans">Lihat paket</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="interactive hover:scale-[1.02] active:scale-[0.98]">
            <Link href="/sign-in">
              <GoogleIcon className="h-4 w-4" />
              Sign in dengan Google
            </Link>
          </Button>
        </div>
      </div>
    </SectionContainer>
  );
}
