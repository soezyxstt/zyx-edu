import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import { LandingSubjectShowcase } from "@/components/landing/landing-subject-showcase";
import { SectionContainer } from "@/components/layout/section-container";
import { SectionHeading } from "@/components/ui/section-heading";

export function LandingCoursePreview() {
  return (
    <SectionContainer className="border-b border-border bg-muted" aria-labelledby="courses-heading">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-xl">
            <SectionHeading id="courses-heading" tier="secondary">
              Bidang studi — jelas dan bertingkat
            </SectionHeading>
            <p className="mt-3 max-w-prose text-body-md text-muted-foreground">
              Pilih bidang di tab, lihat cuplikan topik di panel, lalu buka katalog untuk detail enrollment.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-md">
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
