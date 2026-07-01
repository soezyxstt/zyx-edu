import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { env } from "@/lib/env";
import { pageTitle } from "@/lib/site";
import { PKA_SUBJECTS, PKA_SUBJECT_LABELS, type PkaSubject } from "@/lib/pka-config";
import { getSubjectStageState } from "@/lib/pka-simulation";
import { requirePkaSession } from "@/lib/pka-enrollment";
import { SubjectStageList } from "@/components/pka/subject-stage-list";
import { Reveal } from "@/components/ui/reveal";

type Props = { params: Promise<{ subject: string }> };

function isPkaSubject(value: string): value is PkaSubject {
  return (PKA_SUBJECTS as readonly string[]).includes(value);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subject } = await params;
  const label = isPkaSubject(subject) ? PKA_SUBJECT_LABELS[subject] : "PKA";
  return {
    title: pageTitle(`Simulasi PKA ${label}`),
    description: `Simulasi bertingkat Stage 1-3 untuk PKA ${label}.`,
  };
}

export default async function PkaSubjectPage({ params }: Props) {
  if (env.FEATURE_PKA !== "1") notFound();

  const { subject } = await params;
  if (!isPkaSubject(subject)) notFound();

  const userId = await requirePkaSession(`/pka/${subject}`);
  const stages = await getSubjectStageState(userId, subject);

  return (
    <div className="space-y-6">
      <Reveal>
        <Link href="/pka" className="inline-flex items-center gap-1.5 text-body-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground">
          <ArrowLeft className="size-4" />
          Kembali ke Tutorial PKA
        </Link>
      </Reveal>

      <Reveal>
        <div className="space-y-2">
          <h1 className="font-heading text-h4 font-bold text-foreground">Simulasi PKA {PKA_SUBJECT_LABELS[subject]}</h1>
          <p className="text-body-base text-muted-foreground">
            Kerjakan Stage 1 terlebih dahulu. Lolos ambang skor stage tersebut akan otomatis melewati stage berikutnya,
            sama seperti alur PKA Matematika ITB yang sebenarnya.
          </p>
        </div>
      </Reveal>

      <Reveal>
        <div className="rounded-xl border border-border bg-card p-2 shadow-sm sm:p-4">
          <SubjectStageList subject={subject} stages={stages} />
        </div>
      </Reveal>
    </div>
  );
}
