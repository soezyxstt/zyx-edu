"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const subjects = [
  {
    id: "calc",
    title: "Kalkulus & metode numerik",
    tag: "TPB",
    blurb: "Limit, turunan, integral, dan aplikasi ke model sederhana.",
    accent: "from-brand-primary/25 to-transparent",
    bar: "bg-brand-primary",
  },
  {
    id: "phys",
    title: "Fisika dasar",
    tag: "TPB",
    blurb: "Mekanika, gelombang, termodinamika pengantar — dengan latihan terarah.",
    accent: "from-status-info/25 to-transparent",
    bar: "bg-status-info",
  },
  {
    id: "chem",
    title: "Kimia dasar",
    tag: "TPB",
    blurb: "Stokiometri, kesetimbangan, dan dasar laboratorium.",
    accent: "from-tertiary-1/30 to-transparent",
    bar: "bg-tertiary-1",
  },
  {
    id: "linalg",
    title: "Aljabar linear",
    tag: "Jurusan",
    blurb: "Vektor, matriks, dan ruang vektor untuk persiapan kuliah lanjut.",
    accent: "from-tertiary-3/25 to-transparent",
    bar: "bg-tertiary-3",
  },
  {
    id: "statics",
    title: "Statika & mekanika",
    tag: "Jurusan",
    blurb: "Diagram gaya, momen, dan fondasi untuk teknik sipil & mesin.",
    accent: "from-brand-secondary/20 to-transparent",
    bar: "bg-brand-secondary",
  },
  {
    id: "mecha",
    title: "Mekatronika / dinamika",
    tag: "Jurusan",
    blurb: "Model sistem, sensor, dan kontrol pengantar secara terstruktur.",
    accent: "from-status-warning/25 to-transparent",
    bar: "bg-status-warning",
  },
];

export function SubjectCarousel() {
  const [i, setI] = useState(0);
  const n = subjects.length;

  const go = useCallback(
    (dir: -1 | 1) => {
      setI((prev) => (prev + dir + n) % n);
    },
    [n]
  );

  useEffect(() => {
    const id = window.setInterval(() => go(1), 6500);
    return () => window.clearInterval(id);
  }, [go]);

  const active = subjects[i];

  return (
    <div className="relative mt-10 md:mt-12">
      <div
        className="relative min-h-[200px] overflow-hidden md:min-h-[220px]"
        aria-roledescription="carousel"
        aria-live="polite"
      >
        <div
          key={active.id}
          className="flex flex-col items-center justify-center gap-4 px-2 text-center motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-500"
        >
          <div
            className={cn(
              "pointer-events-none absolute inset-0 -z-10 rounded-[2rem] bg-linear-to-br opacity-90",
              active.accent
            )}
            aria-hidden
          />
          <span className={cn("inline-block h-1.5 w-14 rounded-full", active.bar)} />
          <p className="text-body-sm font-medium uppercase tracking-wide text-muted-foreground">
            {active.tag}
          </p>
          <h3 className="font-heading text-h4 font-bold text-foreground md:text-h3">{active.title}</h3>
          <p className="max-w-lg text-body-md text-muted-foreground">{active.blurb}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {subjects.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setI(idx)}
            className={cn(
              "rounded-full px-3 py-1.5 text-body-sm font-medium transition-all duration-200 hover:scale-105",
              idx === i
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
            aria-label={`Tampilkan ${s.title}`}
            aria-current={idx === i}
          >
            {s.title.split(" ")[0]}
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full transition-transform hover:scale-110 active:scale-95"
          onClick={() => go(-1)}
          aria-label="Bidang sebelumnya"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full transition-transform hover:scale-110 active:scale-95"
          onClick={() => go(1)}
          aria-label="Bidang berikutnya"
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>

      <p className="mt-6 text-center text-body-sm text-muted-foreground">
        <Link href="/courses" className="font-medium text-brand-primary underline-offset-4 hover:underline">
          Lihat katalog lengkap
        </Link>
      </p>
    </div>
  );
}
