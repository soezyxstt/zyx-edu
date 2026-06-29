import type { ReactNode } from "react";
import { AdminTabNav } from "@/components/admin/tab-nav";

export default function EvalLayout({ children }: { children: ReactNode }) {
  const tabs = [
    { href: "/admin/ai/questions", label: "Bank Soal" },
    { href: "/admin/ai/jobs", label: "Generasi Soal" },
    { href: "/admin/ai/quizzes", label: "Template Kuis" },
    { href: "/admin/ai/distractors", label: "Analitik Distraktor" },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 text-left">
        <h1 className="font-heading text-h4 font-bold text-foreground">Evaluasi & Bank Soal</h1>
        <p className="mt-1 text-body-sm text-muted-foreground">
          Kelola bank soal hasil ekstraksi, pantau pekerjaan LLM, buat kuis, dan analisis miskonsepsi siswa.
        </p>
      </div>
      <AdminTabNav tabs={tabs} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
