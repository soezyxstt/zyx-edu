"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
    company: "ZYX Edu",
    avatarSrc:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=1200&h=900&fit=crop",
  },
  {
    id: "2",
    quote:
      "Tryout-nya membantu membiasakan format tulis dan waktu. Umpan baliknya jelas untuk bagian objektif.",
    name: "Raka",
    role: "Teknik Mesin",
    company: "Student Story",
    avatarSrc:
      "https://images.unsplash.com/photo-1463453091185-61582044d556?w=1200&h=900&fit=crop",
  },
  {
    id: "3",
    quote:
      "Modulnya rapi — aku bisa lihat mana yang harus diprioritaskan minggu ini tanpa membuka lima folder berbeda.",
    name: "Dina",
    role: "Teknik Industri",
    company: "Learning Journey",
    avatarSrc:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=1200&h=900&fit=crop",
  },
];

export function TestimonialCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<EmblaCarouselType | null>(null);
  return (
    <div className="relative mt-10 md:mt-12">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-foreground">
        <Image
          src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=1800&h=1200&fit=crop"
          alt="Background testimonial visual"
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 1200px"
        />
        <div className="absolute inset-0 bg-foreground/72" />

        <div className="relative z-10 px-6 pt-8 pb-6 md:px-10 md:pt-10">
          <div className="mb-5 flex justify-center">
            <span className="rounded-full bg-background/85 px-3 py-1 text-xs font-medium uppercase tracking-wider text-foreground">
              Customer Feedback
            </span>
          </div>

          <h3 className="mx-auto max-w-3xl text-center font-heading text-3xl leading-tight font-semibold text-background md:text-5xl">
            We are shaping the future together with you.
          </h3>

          <div className="mt-8 border-b border-background/25" />
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
                className="rounded-2xl border border-border bg-card p-4 shadow-sm md:p-5"
              >
                <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr]">
                  <div className="relative min-h-[240px] overflow-hidden rounded-xl md:min-h-[320px]">
                    <Image src={t.avatarSrc} alt={t.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 420px" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t.company}</p>
                    <span aria-hidden className="mt-2 text-5xl leading-none text-primary/20">
                      &ldquo;
                    </span>
                    <blockquote itemProp="reviewBody" className="mt-2 text-body-lg text-foreground">
                      {t.quote}
                    </blockquote>
                    <figcaption className="mt-5 text-sm text-muted-foreground">
                      <span itemProp="author" itemScope itemType="https://schema.org/Person">
                        <span itemProp="name" className="font-semibold text-foreground">{t.name}</span>
                      </span>
                      <span className="block">{t.role}</span>
                    </figcaption>
                  </div>
                </div>
              </figure>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious aria-label="Testimoni sebelumnya" className="bg-card text-foreground border-border hover:bg-muted" />
        <CarouselNext aria-label="Testimoni berikutnya" className="bg-card text-foreground border-border hover:bg-muted" />
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
              idx === activeIndex ? "h-2 w-4 rounded-full bg-primary" : "h-2 w-2 rounded-full bg-border"
            )}
          />
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Link
          href="/testimonial"
          className="interactive text-body-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
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
