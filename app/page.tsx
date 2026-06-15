import type { Metadata } from "next";
import {
  // LandingClosingCta,
  LandingCoursePreview,
  LandingDemoFlashcards,
  LandingDemoPath,
  LandingDemoQuiz,
  LandingDemoTutor,
  LandingForTutors,
  LandingHero,
  LandingLearningLoop,
  LandingPricingPreview,
  LandingTestimonials,
} from "@/components/landing";
import { pageTitle, siteDescription } from "@/lib/site";

export const metadata: Metadata = {
  title: pageTitle(),
  description: siteDescription,
};

export default function Home() {
  return (
    <div className="flex flex-col">
      <LandingHero />
      <LandingLearningLoop />
      <LandingDemoQuiz />
      <LandingDemoTutor />
      <LandingDemoFlashcards />
      <LandingDemoPath />
      <LandingForTutors />
      <LandingCoursePreview />
      <LandingTestimonials />
      <LandingPricingPreview />
      {/* <LandingClosingCta /> */}
    </div>
  );
}
