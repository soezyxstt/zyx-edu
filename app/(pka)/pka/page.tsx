import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { env } from "@/lib/env";
import { pageTitle } from "@/lib/site";
import { PKA_ASSUMED_TEST_DATE, PKA_DISCLAIMER, PKA_SUBJECTS, PKA_SUBJECT_LABELS } from "@/lib/pka-config";
import { getSubjectStageState } from "@/lib/pka-simulation";
import { requirePkaSession } from "@/lib/pka-enrollment";
import { PkaCountdown } from "@/components/pka/pka-countdown";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: pageTitle("Tutorial PKA gratis"),
  description: "Simulasi gratis Pemetaan Kesiapan Akademik (PKA) ITB untuk mahasiswa baru: Matematika, Fisika, Kimia.",
};

export default async function PkaLandingPage() {
  if (env.FEATURE_PKA !== "1") notFound();

  const userId = await requirePkaSession("/pka");

  const subjectStages = await Promise.all(
    PKA_SUBJECTS.map(async (subject) => ({
      subject,
      stages: await getSubjectStageState(userId, subject),
    })),
  );

  const anyAttempted = subjectStages.some(({ stages }) => stages.some((s) => s.status === "completed"));

  return (
    <div className="space-y-8">
      <Reveal>
        <div className="space-y-3">
          <span className="inline-flex items-center rounded-md bg-brand-secondary/10 px-2.5 py-1 text-body-sm font-semibold text-brand-secondary">
            Kampanye gratis untuk maba ITB
          </span>
          <h1 className="font-heading text-h4 font-bold text-foreground sm:text-h3">Tutorial PKA gratis</h1>
          <p className="text-body-base text-muted-foreground">
            Simulasi latihan mandiri untuk Pemetaan Kesiapan Akademik (PKA) ITB: Matematika, Fisika, dan Kimia,
            mengikuti alur bertingkat Stage 1 - Stage 2 - Stage 3 seperti tes aslinya. Lolos di stage awal,
            langsung lewati stage berikutnya.
          </p>
        </div>
      </Reveal>

      <Reveal>
        <PkaCountdown targetDate={PKA_ASSUMED_TEST_DATE.toISOString()} />
      </Reveal>

      <Reveal>
        <div className="space-y-3">
          <h2 className="font-heading text-h6 font-bold text-foreground">Pilih mapel</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {subjectStages.map(({ subject, stages }) => {
              const completedCount = stages.filter((s) => s.status === "completed" || s.status === "skipped").length;
              const nextStage = stages.find((s) => s.status === "unlocked");
              return (
                <Link
                  key={subject}
                  href={`/pka/${subject}`}
                  className="group flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-colors duration-150 hover:border-brand-primary/50"
                >
                  <div>
                    <h3 className="font-heading text-h6 font-bold text-foreground">{PKA_SUBJECT_LABELS[subject]}</h3>
                    <p className="mt-1 text-body-sm text-muted-foreground">{completedCount} / 3 stage tuntas</p>
                  </div>
                  <span className="mt-4 flex items-center gap-1 text-body-sm font-semibold text-brand-primary">
                    {nextStage ? `Lanjut Stage ${nextStage.stage}` : completedCount === 3 ? "Lihat hasil" : "Mulai"}
                    <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </Reveal>

      {anyAttempted && (
        <Reveal>
          <Link
            href="/pka/report"
            className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm transition-colors duration-150 hover:border-brand-primary/50"
          >
            <span className="text-body-sm font-semibold text-foreground">Lihat laporan diagnostik lengkap</span>
            <ArrowRight className="size-4 text-brand-primary" />
          </Link>
        </Reveal>
      )}

      <Reveal>
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
          <ShieldAlert className="size-5 shrink-0 text-muted-foreground" />
          <p className="text-body-sm text-muted-foreground">{PKA_DISCLAIMER}</p>
        </div>
      </Reveal>
    </div>
  );
}
