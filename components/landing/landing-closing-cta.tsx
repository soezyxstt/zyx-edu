import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/components/layout/section-container";
import { SectionHeading } from "@/components/ui/section-heading";

export function LandingClosingCta() {
  return (
    <SectionContainer
      className="relative overflow-hidden border-b border-border bg-background text-foreground"
      aria-labelledby="closing-heading"
      tight
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,color-mix(in_oklch,var(--color-brand-primary)_22%,transparent),transparent)]"
        aria-hidden
      />
      <div className="relative text-center">
        <SectionHeading id="closing-heading" tier="primary" className="text-foreground">
          Siap mulai semester ini dengan rencana belajar?
        </SectionHeading>
        <p className="mx-auto mt-4 max-w-prose text-body-lg text-muted-foreground">
          Cek paket layanan, baca prinsip pengajaran kami, atau langsung masuk dengan akun Google untuk
          menjelajahi dashboard.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" variant="default" className="interactive hover:scale-[1.02] active:scale-[0.98]">
            <Link href="/plans">Lihat paket</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="interactive hover:scale-[1.02] active:scale-[0.98]">
            <Link href="/sign-in">Sign in dengan Google</Link>
          </Button>
        </div>
      </div>
    </SectionContainer>
  );
}
