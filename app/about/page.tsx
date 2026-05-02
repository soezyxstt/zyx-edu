import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageHero } from "@/components/marketing-page-hero";
import { SectionContainer } from "@/components/layout/section-container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { pageTitle } from "@/lib/site";
import { ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: pageTitle("About"),
  description:
    "Prinsip pengajaran Zyx Edu: struktur, empati mahasiswa ITB, dan standar materi yang konsisten.",
};

export default function AboutPage() {
  return (
    <div className="flex flex-col">
      <MarketingPageHero
        sectionId="about"
        eyebrow="Zyx Edu"
        title="Tentang kami"
        description="Kami membangun pengalaman belajar yang tenang dan terukur — dari TPB hingga awal jurusan."
      />

      <SectionContainer className="border-b border-border bg-muted">
          <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
            <section aria-labelledby="principles-heading" className="space-y-4">
              <SectionHeading id="principles-heading" tier="primary" className="text-foreground">
                Prinsip pengajaran
              </SectionHeading>
              <ul className="flex flex-col gap-4 text-body-md text-muted-foreground">
                <li className="flex gap-3">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  <span>
                    <span className="font-semibold text-foreground">Struktur dulu, kecepatan kemudian</span>
                    {" — "}
                    fondasi konsep sebelum loncat ke soal tingkat ujian.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-secondary" aria-hidden />
                  <span>
                    <span className="font-semibold text-foreground">Bahasa yang ramah</span>
                    {" — "}
                    menjelaskan tanpa membuatmu merasa tertinggal.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-tertiary-1" aria-hidden />
                  <span>
                    <span className="font-semibold text-foreground">Latihan yang mirip konteks nyata</span>
                    {" — "}
                    format kuis dan tryout mengikuti pola yang biasa kamu lihat di kelas.
                  </span>
                </li>
              </ul>
            </section>

            <section
              aria-labelledby="audience-heading"
              className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8"
            >
              <SectionHeading id="audience-heading" as="h2" tier="secondary" className="text-card-foreground">
                Untuk siapa Zyx?
              </SectionHeading>
              <p className="mt-4 text-body-md text-muted-foreground">
                Mahasiswa ITB tahun pertama dan kedua yang ingin jadwal belajar jelas, materi yang selaras dengan
                perkuliahan, dan pendampingan dari tutor yang memahami tekanan kampus.
              </p>
              <p className="mt-4 text-body-md text-muted-foreground">
                Kami tidak menggantikan perkuliahan — kami membantu kamu menavigasinya dengan lebih percaya diri.
              </p>
              <Button asChild variant="marketingPrimary" size="marketing" className="mt-8 w-full sm:w-auto">
                <Link href="/plans">
                  Lihat layanan &amp; paket
                  <ChevronRight className="size-4" data-icon="inline-end" />
                </Link>
              </Button>
            </section>
          </div>
      </SectionContainer>
    </div>
  );
}
