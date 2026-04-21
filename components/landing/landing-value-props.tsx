import { BookOpen, Gauge, Users } from "lucide-react";
import { SectionContainer } from "@/components/layout/section-container";
import { SectionHeading } from "@/components/ui/section-heading";

const items = [
  {
    title: "Kurikulum yang selaras kampus",
    body: "Modul disusun mengikuti mata kuliah umum dan awal jurusan — fokus pada pemahaman, bukan sekadar mengerjakan soal.",
    icon: BookOpen,
  },
  {
    title: "Latihan & format ujian yang familiar",
    body: "Kuis dan tryout dengan tipe soal variatif, penilaian instan di bagian objektif, dan umpan balik untuk esai.",
    icon: Gauge,
  },
  {
    title: "Tutor sesama lingkungan ITB",
    body: "Dibimbing oleh tutor yang memahami ritme perkuliahan, bahasa pengajaran, dan titik sulit klasik mahasiswa.",
    icon: Users,
  },
];

export function LandingValueProps() {
  return (
    <SectionContainer className="border-b border-border bg-muted" aria-labelledby="value-heading">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading id="value-heading" tier="secondary" className="text-foreground">
            Tiga alasan mahasiswa bertahan belajar di sini
          </SectionHeading>
          <p className="mt-4 max-w-prose text-body-md text-muted-foreground">
            Kombinasi struktur materi, latihan yang relevan, dan pendampingan yang manusiawi.
          </p>
        </div>

        <ol className="mt-12 divide-y divide-border border-y border-border">
          {items.map((item, idx) => (
            <li
              key={item.title}
              className="flex flex-col gap-4 py-10 first:pt-8 last:pb-8 md:flex-row md:items-start md:gap-10 md:py-12"
            >
              <div className="flex items-center gap-4 md:w-48 md:shrink-0 md:flex-col md:items-start md:gap-3">
                <span className="interactive flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary hover:scale-[1.02] hover:bg-primary/15">
                  <item.icon className="size-6" aria-hidden />
                </span>
                <span className="text-body-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {String(idx + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-heading text-h4 font-semibold text-foreground">{item.title}</h3>
                <p className="mt-3 max-w-prose text-body-md text-muted-foreground">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
    </SectionContainer>
  );
}
