import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import { LandingSubjectShowcase } from "@/components/landing/landing-subject-showcase";
import { SectionContainer } from "@/components/layout/section-container";
import { SectionHeading } from "@/components/ui/section-heading";

export function LandingCoursePreview() {
  return (
    <SectionContainer className="border-b border-border bg-background" aria-labelledby="courses-heading">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--zx-accent)]">Katalog</p>
        <SectionHeading id="courses-heading" tier="secondary" className="mt-2">
          Bidang studi — jelas dan bertingkat
        </SectionHeading>
        <p className="mt-3 max-w-prose text-body-md text-muted-foreground">
          Pilih bidang di tab, lihat cuplikan topik di panel, lalu buka katalog untuk detail materi dan pendaftaran.
        </p>
        <Button
          asChild
          variant="marketingSecondary"
          size="marketing"
          className="mt-6 bg-background sm:mt-7"
        >
          <Link href="/courses">
            Lihat katalog
            <ArrowUpRight className="size-4" data-icon="inline-end" />
          </Link>
        </Button>
      </div>

      <div className="mt-10 md:mt-12">
        <LandingSubjectShowcase />
      </div>
    </SectionContainer>
  );
}
