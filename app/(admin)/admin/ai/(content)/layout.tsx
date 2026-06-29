import type { ReactNode } from "react";
import { AdminTabNav } from "@/components/admin/tab-nav";

export default function ContentLayout({ children }: { children: ReactNode }) {
  const tabs = [
    { href: "/admin/ai/materials", label: "Materi AI" },
    { href: "/admin/ai/assessments", label: "Asesmen Historis" },
    { href: "/admin/ai/diktats", label: "Kompilasi Diktat" },
    { href: "/admin/ai/ast-inspector", label: "AST Inspector" },
  ];

  return (
    <div className="flex flex-col min-h-screen py-8">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-6 text-left">
          <h1 className="font-heading text-h4 font-bold text-foreground">RAG & Basis Pengetahuan</h1>
          <p className="mt-1 text-body-sm text-muted-foreground">
            Kelola materi kuliah, pustaka asesmen historis, kompilasi diktat PDF, dan parser AST.
          </p>
        </div>
        <AdminTabNav tabs={tabs} />
      </div>
      <div className="flex-1 w-full flex flex-col">{children}</div>
    </div>
  );
}
