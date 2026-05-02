"use client";

import { MarketingHeroLoops } from "@/components/marketing-hero-loops";

export function CoursesAmbient() {
  return (
    <>
      <MarketingHeroLoops id="courses-area" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-linear-to-b from-transparent via-background/35 to-background/75" />
    </>
  );
}
