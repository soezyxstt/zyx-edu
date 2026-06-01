import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { pageTitle } from "@/lib/site";
import { FolderOpen, KeyRound, BookText, Zap, ListChecks, ClipboardList } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: pageTitle("Admin"),
  description: "Panel admin Zyx Academy.",
};

const sections = [
  {
    title: "File Storage",
    description:
      "Unggah, atur, ganti nama, dan hapus berkas dalam struktur folder bergaya Google Drive.",
    icon: FolderOpen,
    iconColor: "text-brand-primary",
    href: "/admin/files",
    label: "Open file manager",
    variant: "default" as const,
  },
  {
    title: "Token Aktivasi Kelas",
    description:
      "Buat dan kelola token pendaftaran satu kali pakai untuk memberikan akses semester bagi siswa.",
    icon: KeyRound,
    iconColor: "text-brand-secondary",
    href: "/admin/tokens",
    label: "Kelola token",
    variant: "outline" as const,
  },
  {
    title: "Materi AI",
    description:
      "Unggah dan segmentasikan materi kursus ke dalam basis pengetahuan AI. Teks diproses menjadi chunk yang dapat di-embedding ke Pinecone.",
    icon: BookText,
    iconColor: "text-tertiary-1",
    href: "/admin/ai/materials",
    label: "Kelola materi AI",
    variant: "outline" as const,
  },
  {
    title: "Generasi Soal",
    description:
      "Jalankan pipeline generasi soal berbasis Gemini Flash. Pantau status job dan lihat log error secara real-time.",
    icon: Zap,
    iconColor: "text-status-warning",
    href: "/admin/ai/jobs",
    label: "Lihat generation jobs",
    variant: "outline" as const,
  },
  {
    title: "Bank Soal",
    description:
      "Tinjau, edit, setujui, dan publikasikan soal yang dihasilkan AI. Kelola siklus hidup soal dari generated hingga published.",
    icon: ListChecks,
    iconColor: "text-status-success",
    href: "/admin/ai/questions",
    label: "Buka bank soal",
    variant: "outline" as const,
  },
  {
    title: "Template Kuis",
    description:
      "Kelola template kuis, buat kuis secara manual dengan aturan seleksi materi dan kesulitan, serta atur batasan kengerjaan kuis siswa.",
    icon: ClipboardList,
    iconColor: "text-brand-primary",
    href: "/admin/ai/quizzes",
    label: "Kelola kuis",
    variant: "outline" as const,
  },
];

export default function AdminHomePage() {
  return (
    <Reveal className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="font-heading text-h4 font-semibold text-foreground">Admin Panel</h1>
      <p className="mt-2 text-body-md text-muted-foreground">
        Kelola konten dan akses situs Zyx Academy di bawah ini.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <div
            key={s.href}
            className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between"
          >
            <div>
              <h2 className="font-heading text-h6 font-semibold text-foreground flex items-center gap-2">
                <s.icon className={`size-5 ${s.iconColor}`} aria-hidden />
                {s.title}
              </h2>
              <p className="text-body-sm text-muted-foreground mt-2 leading-relaxed">
                {s.description}
              </p>
            </div>
            <Button className="mt-6 gap-2 w-fit rounded-lg" variant={s.variant} asChild>
              <Link href={s.href}>{s.label}</Link>
            </Button>
          </div>
        ))}
      </div>
    </Reveal>
  );
}
