"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { EmblaCarouselType } from "embla-carousel";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, useCarousel } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

const testimonials = [
  {
    id: "1",
    quote:
      "Penjelasan tutor tidak melompat-lompat — cocok buat aku yang butuh fondasi dulu sebelum masuk soal sulit.",
    name: "Alya",
    role: "Mahasiswa TPB",
  },
  {
    id: "2",
    quote:
      "Tryout-nya membantu membiasakan format tulis dan waktu. Umpan baliknya jelas untuk bagian objektif.",
    name: "Raka",
    role: "Teknik Mesin",
  },
  {
    id: "3",
    quote:
      "Modulnya rapi — aku bisa lihat mana yang harus diprioritaskan minggu ini tanpa membuka lima folder berbeda.",
    name: "Dina",
    role: "Teknik Industri",
  },
];

function AvatarPlaceholder({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <>
      {/* TODO: replace with real student photo */}
      <div className="flex size-full min-h-[240px] items-center justify-center rounded-xl bg-linear-to-br from-[#1a2744]/15 to-[var(--zx-accent)]/10 md:min-h-[320px]">
        <div
          className="flex size-28 items-center justify-center rounded-full bg-[#1a2744]/90 font-heading text-3xl font-semibold text-white shadow-inner ring-4 ring-white/10 md:size-32 md:text-4xl"
          aria-hidden
        >
          {initials}
        </div>
      </div>
    </>
  );
}

export function TestimonialCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<EmblaCarouselType | null>(null);
  return (
    <div className="relative mt-10 md:mt-12">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#152238] px-6 pt-10 pb-8 md:px-10 md:pt-12 md:pb-10">
        <p
          className="pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2 select-none text-center font-heading text-[clamp(2.25rem,10vw,5.5rem)] font-black leading-[0.95] tracking-tight text-white/[0.08]"
          aria-hidden
        >
          Suara dari Kelas
        </p>

        <div className="relative z-10 mx-auto max-w-3xl border-b border-white/15 pb-6 text-center">
          <p className="text-body-sm font-medium text-white/70">Mahasiswa &amp; tutor yang terlibat di Zyx Edu</p>
        </div>
      </div>

      <Carousel opts={{ loop: true, align: "start" }} className="mx-auto -mt-10 max-w-6xl px-6 md:-mt-12 md:px-14">
        <CarouselApiBridge onSelect={setActiveIndex} onApi={setCarouselApi} />
        <CarouselContent>
          {testimonials.map((t) => (
            <CarouselItem key={t.id} className="md:basis-1/1">
              <figure
                itemScope
                itemType="https://schema.org/Review"
                className="rounded-2xl border border-white/10 bg-white p-4 shadow-lg md:p-5 dark:bg-card"
              >
                <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr]">
                  <div className="relative min-h-[240px] overflow-hidden rounded-xl md:min-h-[320px]">
                    <AvatarPlaceholder name={t.name} />
                  </div>
                  <div className="flex flex-col justify-center text-foreground">
                    <span aria-hidden className="text-5xl leading-none text-[var(--zx-accent)]/35">
                      &ldquo;
                    </span>
                    <blockquote itemProp="reviewBody" className="mt-2 text-body-lg text-foreground">
                      {t.quote}
                    </blockquote>
                    <figcaption className="mt-5 text-sm text-muted-foreground">
                      <span itemProp="author" itemScope itemType="https://schema.org/Person">
                        <span itemProp="name" className="font-semibold text-foreground">
                          {t.name}
                        </span>
                      </span>
                      <span className="block">{t.role}</span>
                    </figcaption>
                  </div>
                </div>
              </figure>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          aria-label="Testimoni sebelumnya"
          className="border-white/20 bg-[#1a2744] text-white hover:bg-[#1a2744]/90"
        />
        <CarouselNext
          aria-label="Testimoni berikutnya"
          className="border-white/20 bg-[#1a2744] text-white hover:bg-[#1a2744]/90"
        />
      </Carousel>

      <div className="mt-8 flex justify-center gap-2">
        {testimonials.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            onClick={() => carouselApi?.scrollTo(idx)}
            aria-label={`Lihat testimoni ke-${idx + 1}`}
            aria-current={idx === activeIndex ? "true" : undefined}
            className={cn(
              "interactive transition-all duration-200",
              idx === activeIndex ? "h-2 w-4 rounded-full bg-[var(--zx-accent)]" : "h-2 w-2 rounded-full bg-white/30",
            )}
          />
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Link
          href="/testimonial"
          className="interactive text-body-sm font-medium text-white/80 underline decoration-[var(--zx-accent)] underline-offset-4 hover:text-white"
        >
          Baca testimoni lengkap
        </Link>
      </div>
    </div>
  );
}

function CarouselApiBridge({
  onSelect,
  onApi,
}: {
  onSelect: (index: number) => void;
  onApi: (api: EmblaCarouselType | null) => void;
}) {
  const { api } = useCarousel();
  useEffect(() => {
    onApi(api ?? null);
    if (!api) return;
    const update = () => onSelect(api.selectedScrollSnap());
    update();
    api.on("select", update);
    return () => {
      api.off("select", update);
    };
  }, [api, onSelect, onApi]);
  return null;
}
