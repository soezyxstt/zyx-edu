import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/components/layout/section-container";
import { SectionHeading } from "@/components/ui/section-heading";

export function LandingClosingCta() {
  return (
    <SectionContainer
      className="border-b border-border bg-background text-foreground"
      aria-labelledby="closing-heading"
      tight
    >
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--zx-accent)]">Mulai bertahap</p>
        <SectionHeading id="closing-heading" tier="primary" className="mt-2 text-foreground">
          Siap mulai semester ini dengan rencana belajar?
        </SectionHeading>
        <p className="mx-auto mt-4 max-w-prose text-body-lg text-muted-foreground">
          Cek paket layanan, baca prinsip pengajaran kami, atau masuk dengan akun Google untuk menjelajahi dashboard begitu
          akses diaktifkan.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="marketingPrimary" size="marketing">
            <Link href="/plans">Lihat paket</Link>
          </Button>
          <Button
            asChild
            variant="marketingSecondary"
            size="marketing"
            className="bg-background hover:bg-muted/60 dark:bg-background"
          >
            <Link href="/sign-in">Masuk dengan Google</Link>
          </Button>
        </div>
      </div>
    </SectionContainer>
  );
}
