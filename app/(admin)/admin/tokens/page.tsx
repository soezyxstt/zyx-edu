import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageTitle } from "@/lib/site";
import { assertAdmin } from "@/lib/uploadthing-admin";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { getEnrollmentTokens } from "@/app/(admin)/admin/tokens/actions";
import { TokensDashboard } from "@/components/admin/tokens-dashboard";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: pageTitle("Token Pendaftaran"),
  description: "Kelola token pendaftaran siswa untuk kelas.",
};

export default async function AdminTokensPage() {
  try {
    await assertAdmin();
  } catch {
    redirect("/");
  }

  // Fetch initial token rows and list of courses for dropdown selector
  const [tokensList, allCourses] = await Promise.all([
    getEnrollmentTokens(),
    db.select().from(courses),
  ]);

  const coursesList = allCourses.map((c) => ({
    id: c.id,
    title: c.title,
  }));

  return (
    <Reveal className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="xs" className="text-muted-foreground -ml-2 mb-1 gap-1" asChild>
            <Link href="/admin">
              <ArrowLeft className="size-3.5" aria-hidden />
              Admin home
            </Link>
          </Button>
          <h1 className="font-heading text-h4 font-semibold text-foreground">Token Pendaftaran Kelas</h1>
          <p className="mt-1 text-body-sm text-muted-foreground">
            Kelola token satu kali pakai (one-time use) agar siswa dapat melakukan aktivasi pendaftaran kelas.
          </p>
        </div>
      </div>

      <TokensDashboard initialTokens={tokensList} coursesList={coursesList} />
    </Reveal>
  );
}
