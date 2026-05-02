import { Check, ClipboardCheck, Layers, Quote, SpellCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionContainer } from "@/components/layout/section-container";
import { SectionHeading } from "@/components/ui/section-heading";

const curriculumTopics = [
  {
    code: "MA1101",
    title: "Kalkulus IA",
    subtitle: "Limit · kontinuitas · turunan & aplikasi grafik",
    tone: "bg-primary text-primary-foreground",
  },
  {
    code: "FI1101",
    title: "Fisika Dasar IA",
    subtitle: "Mekanika · usaha–energi · momentum",
    tone: "bg-[var(--zx-accent)]/90 text-white",
  },
  {
    code: "KI1102",
    title: "Kimia Dasar IB",
    subtitle: "Reaksi redoks · elektrokimia dasar · termodinamika ringkas",
    tone: "bg-[#1a2744] text-white",
  },
];

function CurriculumPreview() {
  return (
    <div className="w-full space-y-3 rounded-2xl border border-border bg-card p-4 shadow-lg ring-1 ring-black/[0.03] md:p-5">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--zx-accent)]">Perkuliahan paralel</p>
        <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">TPB / awal jurusan</span>
      </div>
      <ul className="space-y-3">
        {curriculumTopics.map((t, i) => (
          <li
            key={t.code}
            className={cn(
              "flex gap-4 rounded-xl border border-border bg-background p-3 shadow-sm md:p-4",
              i === 0 ? "ring-2 ring-[var(--zx-accent)]/30" : "",
            )}
          >
            <span
              className={cn(
                "flex h-10 w-14 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold uppercase tracking-wide",
                t.tone,
              )}
            >
              {t.code}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-heading text-body-base font-semibold text-foreground">{t.title}</p>
              <p className="mt-1 text-body-sm leading-snug text-muted-foreground">{t.subtitle}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SampleQuestionCards() {
  const cards = [
    {
      label: "Pilihan ganda singkat",
      prompt: "Jika 2^x = 64, maka x bernilai …",
      options: ["4", "5", "6", "8"],
      highlight: "5",
      icon: Check,
    },
    {
      label: "Esai struktur pendek",
      prompt: 'Jelaskan perbedaan "resultan" dengan "momentum" dalam satu kalimat matematis.',
      options: [],
      snippet: 'Contoh kerangka jawaban mengutip ∑F = ma vs p = mv.',
      icon: SpellCheck,
    },
    {
      label: "Kode / logika",
      prompt: "Pada array terurut, kompleksitas waktu worst-case binary search adalah…",
      options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
      highlight: "O(log n)",
      icon: ClipboardCheck,
    },
  ] as const;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 md:grid-cols-3 md:gap-5">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <article
            key={c.label}
            className="flex min-h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-md ring-1 ring-black/[0.04]"
          >
            <div className="flex items-center gap-2 text-[var(--zx-accent)]">
              <Icon className="size-5 shrink-0" strokeWidth={2} aria-hidden />
              <h3 className="font-heading text-body-base font-semibold tracking-tight text-foreground">{c.label}</h3>
            </div>
            <p className="mt-4 text-body-sm font-medium leading-relaxed text-foreground">{c.prompt}</p>
            {"options" in c && c.options.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-2">
                {"highlight" in c
                  ? c.options.map((opt) => (
                      <li
                        key={opt}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-center text-body-sm font-medium",
                          opt === c.highlight
                            ? "border-[var(--zx-accent)] bg-[var(--zx-accent)]/10 text-foreground"
                            : "border-border bg-background text-muted-foreground",
                        )}
                      >
                        {opt}
                      </li>
                    ))
                  : null}
              </ul>
            ) : (
              <p className="mt-4 flex-1 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-body-sm leading-relaxed text-muted-foreground">
                {"snippet" in c ? c.snippet : null}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}

function TutorProfileCard() {
  return (
    <article className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card text-center shadow-xl ring-1 ring-black/[0.05] lg:mx-0 lg:max-w-none">
      <div className="bg-linear-to-br from-[#1a2744]/12 via-muted/60 to-[var(--zx-accent)]/10 px-6 pb-8 pt-6 sm:px-8">
        <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-[#1a2744]/10 text-xl font-semibold uppercase tracking-wide text-[#1a2744] ring-4 ring-background">
          AR
        </div>
        <h3 className="mt-4 font-heading text-2xl font-semibold tracking-tight text-foreground">Tutor matematika · Fisdas</h3>
        <p className="mt-2 text-body-sm font-medium text-[var(--zx-accent)]">Teknik Fisika · ITB</p>
        <p className="mx-auto mt-3 max-w-sm text-body-sm leading-relaxed text-muted-foreground">
          Fokus de-rumitkan turunan aplikasi dan mekanika dasar untuk TPB dan awal Teknik Mesin dengan latihan bergambar.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-border bg-background px-6 py-4">
        <span className="rounded-full border border-[#1a2744]/20 bg-muted/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground">
          ITB
        </span>
        <span className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          ≥ 3 tahun bimbing TPB
        </span>
        <span className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Review mingguan
        </span>
      </div>
    </article>
  );
}

export function LandingAdvantages() {
  return (
    <div className="flex flex-col">
      {/* 1 · Selaras kampus */}
      <SectionContainer className="border-b border-border bg-background py-14 md:py-20" aria-labelledby="advantage-campus-heading">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14 xl:gap-20">
          <div className="max-w-xl lg:justify-self-start">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--zx-accent)]">Selaras perkuliahan</p>
            <SectionHeading id="advantage-campus-heading" tier="primary" className="mt-2">
              Selaras kampus
            </SectionHeading>
            <p className="mt-5 max-w-md text-body-md leading-relaxed text-muted-foreground md:text-body-lg">
              Materi mengikuti ritme TPB dan awal jurusan — kamu belajar apa yang relevan dengan kelasmu sekarang, dengan penyusunan capaian yang bisa dipantau minggu demi minggu.
            </p>
          </div>
          <div className="flex lg:justify-end">
            <CurriculumPreview />
          </div>
        </div>
      </SectionContainer>

      {/* 2 · Latihan — grid kartu */}
      <SectionContainer
        className="border-b border-border bg-background py-14 md:py-20"
        aria-labelledby="advantage-practice-heading"
      >
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--zx-accent)]">Format ujian mendekati kelas</p>
          <SectionHeading id="advantage-practice-heading" tier="primary" className="mt-2">
            Latihan yang relevan
          </SectionHeading>
          <p className="mx-auto mt-4 max-w-2xl text-body-md leading-relaxed text-muted-foreground">
            Kombinasi soal objektif, esai terstruktur, dan blok logika agar pola pikirmu konsisten antara latihan daring dan lembar tulis kampus.
          </p>
        </div>
        <div className="mt-12">
          <SampleQuestionCards />
        </div>
      </SectionContainer>

      {/* 3 · Tutor */}
      <SectionContainer className="border-b border-border bg-background py-12 md:py-16" aria-labelledby="advantage-mentor-heading">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-10 xl:gap-14">
          <div className="mx-auto max-w-xl text-center lg:mx-0 lg:justify-self-start lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--zx-accent)]">Orang dalam ritme kuliah</p>
            <SectionHeading id="advantage-mentor-heading" tier="primary" className="mt-2">
              Pendampingan ITB
            </SectionHeading>
            <p className="mt-4 text-body-md leading-relaxed text-muted-foreground lg:max-w-md xl:max-w-lg">
              Diskusi langsung bersama tutor yang memahami kecepatan perkuliahan, format tryout fakultas, dan kesalahan klasik mahasiswa awal jalur STEM.
            </p>
          </div>
          <div className="relative flex justify-center lg:justify-end">
            <Quote
              className="pointer-events-none absolute -top-6 right-[-4%] size-24 text-[var(--zx-accent)]/10 lg:left-auto lg:right-0 lg:top-0 lg:size-28 lg:translate-x-1/4"
              strokeWidth={0.85}
              aria-hidden
            />
            <Layers
              className="pointer-events-none absolute -bottom-2 left-[6%] size-20 text-primary/8 max-lg:hidden lg:left-auto lg:right-[12%] lg:bottom-0"
              aria-hidden
            />
            <div className="relative z-[1] w-full max-w-md lg:max-w-xl xl:max-w-2xl">
              <TutorProfileCard />
            </div>
          </div>
        </div>
      </SectionContainer>
    </div>
  );
}
