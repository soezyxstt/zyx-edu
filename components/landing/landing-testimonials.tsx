import { AnimatedOrnamentCanvas } from "@/components/animated-ornament-canvas";
import { TestimonialCarousel } from "@/components/landing/testimonial-carousel";
import { SectionContainer } from "@/components/layout/section-container";
import { SectionHeading } from "@/components/ui/section-heading";

export function LandingTestimonials() {
  return (
    <SectionContainer
      className="relative overflow-hidden border-b border-white/10 bg-[#1a2744] text-white"
      aria-labelledby="testimonials-heading"
    >
      <AnimatedOrnamentCanvas
        className="opacity-25"
        variant="constellation"
        symbolSet={["story", "growth", "result", "mentor", "community"]}
        particleCount={36}
        tone="dark"
      />
      <div className="pointer-events-none absolute inset-0 z-0 bg-linear-to-b from-transparent via-[#1a2744]/80 to-[#162338]" />

      <div className="relative z-10">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading id="testimonials-heading" tier="secondary" className="text-white">
            Suara dari kelas
          </SectionHeading>
          <p className="mt-3 max-w-prose text-body-md text-white/75">
            Cerita langsung dari mahasiswa dan tutor. Geser kartu atau pilih titik di bawah untuk melihat kutipan lainnya.
          </p>
        </div>

        <TestimonialCarousel />
      </div>
    </SectionContainer>
  );
}
