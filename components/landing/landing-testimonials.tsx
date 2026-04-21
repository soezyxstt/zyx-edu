import { AnimatedOrnamentCanvas } from "@/components/animated-ornament-canvas";
import { TestimonialCarousel } from "@/components/landing/testimonial-carousel";
import { SectionContainer } from "@/components/layout/section-container";
import { SectionHeading } from "@/components/ui/section-heading";

export function LandingTestimonials() {
  return (
    <SectionContainer className="relative overflow-hidden border-b border-border bg-background" aria-labelledby="testimonials-heading">
      <AnimatedOrnamentCanvas
        className="opacity-35"
        variant="constellation"
        symbolSet={["story", "growth", "result", "mentor", "community"]}
        particleCount={36}
        waveOpacity={0.1}
        lineOpacity={0.05}
      />
      <div className="pointer-events-none absolute inset-0 z-0 bg-linear-to-b from-transparent via-background/30 to-background/80" />
      <div className="relative z-10">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading id="testimonials-heading" tier="secondary" className="text-foreground">
            Suara dari kelas
          </SectionHeading>
          <p className="mt-3 max-w-prose text-body-md text-muted-foreground">
            Cerita langsung dari siswa dan tutor kami. Geser dengan panah atau pilih nama untuk melihat testimoni lainnya.
          </p>
        </div>

        <TestimonialCarousel />
      </div>
    </SectionContainer>
  );
}
