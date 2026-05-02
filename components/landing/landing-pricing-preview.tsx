import Link from "next/link";
import { Check } from "lucide-react";
import { SectionContainer } from "@/components/layout/section-container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { planTiers } from "@/lib/plan-tiers";

export function LandingPricingPreview() {
  return (
    <SectionContainer className="border-b border-border bg-background" aria-labelledby="pricing-preview-heading">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--zx-accent)]">Transparansi</p>
        <SectionHeading id="pricing-preview-heading" tier="secondary" className="mt-2 text-foreground">
          Pratinjau paket
        </SectionHeading>
        <p className="mt-3 text-body-md text-muted-foreground">
          Bandingkan tier sekilas — detail pembayaran dan aktivasi akses dibahas langsung dengan admin setelah Anda memilih jalur yang cocok.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-6xl gap-5 md:grid-cols-3 md:gap-6">
        {planTiers.map((tier) => (
          <article
            key={tier.name}
            className={cn(
              "flex flex-col rounded-2xl border p-6 shadow-sm md:p-7",
              tier.highlighted ? "relative border-[var(--zx-accent)] bg-card ring-2 ring-[var(--zx-accent)]/25" : "border-border bg-card",
            )}
          >
            {tier.highlighted ? (
              <Badge className="absolute -top-2.5 left-6 bg-[var(--zx-accent)] text-white hover:bg-[var(--zx-accent)]">
                Rekomendasi
              </Badge>
            ) : null}
            <h3 className="font-heading text-xl font-semibold tracking-tight text-foreground md:text-2xl">{tier.name}</h3>
            <p className="mt-2 font-heading text-lg font-semibold text-[#1a2744] dark:text-foreground">{tier.price}</p>
            <p className="mt-1 text-body-sm text-muted-foreground">{tier.note}</p>
            <ul className="mt-5 flex flex-1 flex-col gap-3">
              {tier.features.slice(0, 3).map((f) => (
                <li key={f} className="flex gap-2 text-left text-body-sm text-muted-foreground">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#1a2744]/10 text-[#1a2744] dark:bg-background/15 dark:text-background">
                    <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-2">
              <Button asChild variant="marketingPrimary" size="marketing" className="w-full">
                <Link href="/plans">Lihat paket lengkap</Link>
              </Button>
              <Button asChild variant="marketingSecondary" size="marketing" className="w-full">
                <Link href="/feedback">Hubungi untuk detail</Link>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </SectionContainer>
  );
}
