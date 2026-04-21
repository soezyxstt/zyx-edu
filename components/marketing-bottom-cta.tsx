import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";

type MarketingBottomCtaProps = {
  heading: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
};

export function MarketingBottomCta({
  heading,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: MarketingBottomCtaProps) {
  return (
    <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-card p-8 text-center shadow-sm md:p-10">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_120%,color-mix(in_oklch,var(--color-primary)_18%,transparent),transparent)]"
        aria-hidden
      />
      <div className="relative">
        <SectionHeading tier="secondary" className="text-foreground">
          {heading}
        </SectionHeading>
        <p className="mx-auto mt-3 max-w-2xl text-body-md text-muted-foreground">{description}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild className="h-11 min-w-[180px] rounded-xl bg-primary px-8 text-primary-foreground">
            <Link href={primaryHref}>{primaryLabel}</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 min-w-[180px] rounded-xl">
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
