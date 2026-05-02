import { type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionContainer } from "@/components/layout/section-container";
import { SectionHeading } from "@/components/ui/section-heading";

export type LandingFeatureBandProps = {
  id: string;
  heading: string;
  items: string[];
  mock: ReactNode;
  reverse?: boolean;
};

export function LandingFeatureBand({ id, heading, items, mock, reverse }: LandingFeatureBandProps) {
  const headingId = `${id}-heading`;
  return (
    <SectionContainer
      id={id}
      className="border-b border-white/10 bg-foreground text-background"
      aria-labelledby={headingId}
    >
      <div
        className={cn(
          "grid grid-cols-1 items-center gap-10 lg:gap-20",
          reverse ? "lg:grid-cols-[1.15fr_1fr]" : "lg:grid-cols-[1fr_1.15fr]"
        )}
      >
          <div>
            <SectionHeading id={headingId} tier="primary" className="text-background">
              {heading}
            </SectionHeading>
            <ul className="mt-8 flex flex-col gap-4">
              {items.map((text) => (
                <li key={text} className="flex gap-3 text-body-md text-background/70">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/25 text-primary">
                    <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={cn("relative flex justify-center", reverse ? "lg:justify-start" : "lg:justify-end")}>
            <div
              className={cn(
                "relative w-full max-w-lg rounded-3xl bg-primary/20 p-6 ring-1 ring-white/10 md:p-8",
                "before:pointer-events-none before:absolute before:-inset-px before:rounded-3xl before:bg-linear-to-br before:from-white/10 before:to-transparent before:opacity-50 interactive"
              )}
            >
              {mock}
            </div>
          </div>
      </div>
    </SectionContainer>
  );
}

export function FeatureBandSearchMock({ query, cursorLabel }: { query: string; cursorLabel: string }) {
  return (
    <div className="relative">
      <div className="rounded-2xl border border-background/20 bg-background/10 p-4 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-3 rounded-xl border border-background/20 bg-background/10 px-4 py-3 text-background shadow-inner">
          <span className="text-body-sm text-background/40" aria-hidden>
            Cari
          </span>
          <span className="text-body-base font-medium text-background">
            {query}
            <span className="ml-0.5 inline-block h-4 w-px motion-safe:animate-pulse bg-primary" aria-hidden />
          </span>
        </div>
      </div>
      <div className="pointer-events-none absolute -bottom-2 -right-2 flex items-start gap-1 md:-bottom-1 md:-right-4">
        <span className="mt-1 inline-block size-0 border-l-[10px] border-t-[6px] border-b-[6px] border-l-status-info border-t-transparent border-b-transparent" />
        <span className="rounded-md bg-status-info px-2 py-1 text-body-sm font-semibold text-white shadow-md">
          {cursorLabel}
        </span>
      </div>
    </div>
  );
}

export function FeatureBandQuizMock() {
  return (
    <div className="relative rounded-2xl border border-white/15 bg-black-3/90 p-4 shadow-xl">
      <div className="mb-3 flex gap-2">
        {["Mudah", "Sedang", "Sulit"].map((label, i) => (
          <span
            key={label}
            className={cn(
              "rounded-full px-3 py-1 text-body-sm font-medium",
              i === 1 ? "bg-status-success text-white" : "bg-white/10 text-gray-4"
            )}
          >
            {label}
          </span>
        ))}
      </div>
      <p className="text-body-base font-medium text-white">Turunan pertama dari f(x) = x³ − 3x adalah…</p>
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
        <span className="text-body-sm text-gray-4">Jawaban</span>
        <span className="font-mono text-body-base text-white">3x² − 3</span>
        <Check className="ml-auto size-5 text-status-success" aria-hidden />
      </div>
      <div className="pointer-events-none absolute bottom-6 right-8 hidden items-start gap-1 md:flex">
        <span className="mt-1 inline-block size-0 border-l-[10px] border-t-[6px] border-b-[6px] border-l-brand-secondary border-t-transparent border-b-transparent" />
        <span className="rounded-md bg-brand-secondary px-2 py-1 text-body-sm font-semibold text-black-2 shadow-md">
          Mahasiswa
        </span>
      </div>
    </div>
  );
}
