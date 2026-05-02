import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageHero } from "@/components/marketing-page-hero";
import { SectionContainer } from "@/components/layout/section-container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { pageTitle } from "@/lib/site";
import { Check } from "lucide-react";
import { planTiers } from "@/lib/plan-tiers";

export const metadata: Metadata = {
  title: pageTitle("Plans"),
  description:
    "Paket bimbingan Zyx Edu — kombinasi course, jadwal pertemuan, dan akses materi. Pembayaran di luar website.",
};

export default function PlansPage() {
  return (
    <div className="flex flex-col">
      <MarketingPageHero
        sectionId="plans"
        eyebrow="Layanan"
        title="Paket & layanan"
        description="Pilih kombinasi course dan intensitas pendampingan. Pembayaran dilakukan di luar website; admin akan mengaktifkan akses sesuai paket."
        ornamentVariant="wave-network"
        ornamentSymbols={["starter", "plus", "intensive", "path", "milestone"]}
      />

      <SectionContainer className="border-b border-border bg-muted">
        <div className="grid gap-6 md:grid-cols-3">
            {planTiers.map((tier) => (
              <article
                key={tier.name}
                className={
                  tier.highlighted
                    ? "relative flex flex-col rounded-2xl border-2 border-primary bg-card p-6 shadow-sm ring-1 ring-primary/20 md:p-8"
                    : "flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8"
                }
              >
                {tier.highlighted ? (
                  <Badge className="absolute -top-3 left-6 bg-primary text-primary-foreground">Rekomendasi</Badge>
                ) : null}
                <SectionHeading as="h2" tier="secondary" className="text-card-foreground">
                  {tier.name}
                </SectionHeading>
                <p className="mt-2 font-heading text-h5 text-primary">{tier.price}</p>
                <p className="mt-2 text-body-sm text-muted-foreground">{tier.note}</p>
                <ul className="mt-6 flex flex-1 flex-col gap-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex gap-2 text-body-sm text-muted-foreground">
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild variant="marketingPrimary" size="marketing" className="mt-8 w-full">
                  <Link href="/feedback">Hubungi kami untuk detail</Link>
                </Button>
              </article>
            ))}
          </div>
      </SectionContainer>
    </div>
  );
}
