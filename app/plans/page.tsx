import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageHero } from "@/components/marketing-page-hero";
import { MarketingBottomCta } from "@/components/marketing-bottom-cta";
import { SectionContainer } from "@/components/layout/section-container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { pageTitle } from "@/lib/site";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: pageTitle("Plans"),
  description:
    "Paket bimbingan Zyx Edu — kombinasi course, jadwal pertemuan, dan akses materi. Pembayaran di luar website.",
};

const tiers = [
  {
    name: "Starter",
    price: "Mulai dari IDR —",
    note: "Contoh ilustratif; harga final di konfirmasi admin.",
    features: [
      "Akses materi terpilih per semester",
      "Kuis & tryout dengan penilaian instan (objektif)",
      "Forum diskusi per course",
    ],
  },
  {
    name: "Plus",
    price: "Paket populer",
    note: "Untuk kamu yang ingin ritme mingguan tetap terjaga.",
    features: [
      "Lebih banyak course dalam satu paket",
      "Sesi konsultasi terjadwal (frekuensi menyesuaikan paket)",
      "Tracking progres dan ringkasan performa",
    ],
    highlighted: true,
  },
  {
    name: "Intensive",
    price: "Fokus ujian",
    note: "Persiapan ujian tengah/lengkap dengan latihan bertingkat.",
    features: [
      "Prioritas jadwal tryout",
      "Umpan balik esai oleh pengajar",
      "Rekomendasi perbaikan berbasis hasil latihan",
    ],
  },
];

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
            {tiers.map((tier) => (
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
                <Button
                  asChild
                  className="mt-8 h-11 w-full rounded-xl bg-primary text-primary-foreground"
                >
                  <Link href="/feedback">Hubungi kami untuk detail</Link>
                </Button>
              </article>
            ))}
          </div>
      </SectionContainer>

      <SectionContainer className="border-b border-border bg-background" tight>
        <MarketingBottomCta
          heading="Sudah punya akun?"
          description="Sign in untuk melihat dashboard setelah akses diaktifkan, atau kirim pertanyaan lewat halaman feedback."
          primaryLabel="Sign in"
          primaryHref="/sign-in"
          secondaryLabel="Kembali ke beranda"
          secondaryHref="/"
        />
      </SectionContainer>
    </div>
  );
}
