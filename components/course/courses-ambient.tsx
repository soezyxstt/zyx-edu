"use client";

import { MarketingHeroLoops } from "@/components/marketing-hero-loops";

export function CoursesAmbient() {
  return (
    <div className="absolute top-0 left-0 right-0 h-[400px] overflow-hidden pointer-events-none z-0">
      <MarketingHeroLoops id="courses-area" />
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-background/30 to-background" />
    </div>
  );
}
