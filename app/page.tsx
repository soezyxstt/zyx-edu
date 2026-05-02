import type { Metadata } from "next";
import {
  LandingAdvantages,
  LandingClosingCta,
  LandingCoursePreview,
  LandingHero,
  LandingHowItWorks,
  LandingInteractiveLab,
  LandingIntegrations,
  LandingTestimonials,
} from "@/components/landing";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { pageTitle, siteDescription } from "@/lib/site";

export const metadata: Metadata = {
  title: pageTitle(),
  description: siteDescription,
};

export default function Home() {
  return (
    <div className="flex flex-col">
      <LandingHero />
      <LandingReveal>
        <LandingInteractiveLab />
      </LandingReveal>
      <LandingReveal>
        <LandingAdvantages />
      </LandingReveal>
      <LandingReveal>
        <LandingHowItWorks />
      </LandingReveal>
      <LandingReveal>
        <LandingIntegrations />
      </LandingReveal>
      <LandingReveal>
        <LandingCoursePreview />
      </LandingReveal>
      <LandingReveal>
        <LandingTestimonials />
      </LandingReveal>
      <LandingReveal>
        <LandingClosingCta />
      </LandingReveal>
    </div>
  );
}
