import { AnimatedOrnamentCanvas, type AnimatedOrnamentVariant } from "@/components/animated-ornament-canvas";
import { SectionContainer } from "@/components/layout/section-container";
import { SectionHeading } from "@/components/ui/section-heading";
import { MarketingHeroLoops } from "@/components/marketing-hero-loops";

type MarketingPageHeroProps = {
  /** Used for `aria-labelledby` and stable SVG gradient id. */
  sectionId: string;
  eyebrow?: string;
  title: string;
  description: string;
  ornamentSymbols?: string[];
  ornamentVariant?: AnimatedOrnamentVariant;
};

export function MarketingPageHero({
  sectionId,
  eyebrow,
  title,
  description,
  ornamentSymbols = ["focus", "plan", "goal", "learn", "grow"],
  ornamentVariant = "wave-network",
}: MarketingPageHeroProps) {
  const headingId = `${sectionId}-heading`;

  return (
    <SectionContainer className="relative overflow-hidden border-b border-border bg-background" aria-labelledby={headingId}>
      <MarketingHeroLoops id={sectionId} />
      <AnimatedOrnamentCanvas
        className="opacity-45"
        variant={ornamentVariant}
        symbolSet={ornamentSymbols}
        particleCount={42}
        tone="light"
        waveOpacity={0.08}
        lineOpacity={0.06}
        particleOpacity={0.34}
      />
      <div className="pointer-events-none absolute inset-0 z-0 bg-linear-to-b from-transparent via-background/40 to-background/80" />
      <div className="relative z-10">
        <div className="max-w-3xl space-y-4">
          {eyebrow ? (
            <p className="text-body-sm font-semibold uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
          ) : null}
          <SectionHeading as="h1" tier="hero" id={headingId} className="text-foreground">
            {title}
          </SectionHeading>
          <p className="max-w-2xl text-body-md text-muted-foreground md:text-body-lg">{description}</p>
        </div>
      </div>
    </SectionContainer>
  );
}
