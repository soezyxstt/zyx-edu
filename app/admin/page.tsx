import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { pageTitle } from "@/lib/site";
import { FolderOpen, KeyRound } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: pageTitle("Admin"),
  description: "Panel admin Zyx Edu.",
};

export default function AdminHomePage() {
  return (
    <Reveal className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="font-heading text-h4 font-semibold text-foreground">Admin Panel</h1>
      <p className="mt-2 text-body-md text-muted-foreground">
        Kelola konten dan akses situs Zyx Edu di bawah ini.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {/* Storage Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="font-heading text-h6 font-semibold text-foreground flex items-center gap-2">
              <FolderOpen className="size-5 text-brand-primary" aria-hidden />
              File Storage
            </h2>
            <p className="text-body-sm text-muted-foreground mt-2 leading-relaxed">
              Unggah, atur, ganti nama, dan hapus berkas dalam struktur folder bergaya Google Drive.
            </p>
          </div>
          <Button className="mt-6 gap-2 w-fit rounded-full" asChild>
            <Link href="/admin/files">
              Open file manager
            </Link>
          </Button>
        </div>

        {/* Tokens Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="font-heading text-h6 font-semibold text-foreground flex items-center gap-2">
              <KeyRound className="size-5 text-brand-secondary" aria-hidden />
              Token Aktivasi Kelas
            </h2>
            <p className="text-body-sm text-muted-foreground mt-2 leading-relaxed">
              Buat dan kelola token pendaftaran satu kali pakai untuk memberikan akses semester bagi siswa.
            </p>
          </div>
          <Button className="mt-6 gap-2 w-fit rounded-full" variant="outline" asChild>
            <Link href="/admin/tokens">
              Kelola token pendaftaran
            </Link>
          </Button>
        </div>
      </div>
    </Reveal>
  );
}
