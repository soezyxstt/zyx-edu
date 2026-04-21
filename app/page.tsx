import type { Metadata } from "next";
import {
  FeatureBandQuizMock,
  FeatureBandSearchMock,
  LandingClosingCta,
  LandingCoursePreview,
  LandingFeatureBand,
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
        <LandingIntegrations />
      </LandingReveal>
      <LandingReveal>
        <LandingFeatureBand
          id="kurikulum"
          heading="Dapatkan materi dan sesuaikan dengan kebutuhanmu"
          items={[
            "Modul mengikuti mata kuliah umum dan awal jurusan — fokus pemahaman, bukan sekadar mengerjakan soal.",
            "Latihan dan tryout dengan tipe soal variatif, penilaian instan pada bagian objektif, dan umpan balik untuk esai.",
            "Susun materi andalan dalam modul terstruktur supaya minggu belajarmu tetap punya prioritas jelas.",
          ]}
          mock={<FeatureBandSearchMock query="Integral parsial |" cursorLabel="Tutor" />}
        />
      </LandingReveal>
      <LandingReveal>
        <LandingFeatureBand
          id="latihan"
          heading="Bangun momen paham untuk tiap mahasiswa"
          items={[
            "Penjelasan tutor tidak melompat — cocok untuk memperkuat fondasi sebelum soal sulit.",
            "Diskusi per course menjaga konteks tugas dan konsep yang saling berkaitan.",
            "Skor kuis dan tryout membantu melihat pola kekuatan, kelemahan, dan konsistensi belajar.",
          ]}
          mock={<FeatureBandQuizMock />}
          reverse
        />
      </LandingReveal>
      <LandingReveal>
        <LandingCoursePreview />
      </LandingReveal>
      <LandingReveal>
        <LandingHowItWorks />
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
