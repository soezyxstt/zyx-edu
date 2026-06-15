import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageTitle } from "@/lib/site";
import { assertAdmin } from "@/lib/uploadthing-admin";
import { getCourses } from "./actions";
import { CoursesDashboard } from "@/components/admin/courses-dashboard";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: pageTitle("Kelola Mata Kuliah"),
  description: "Daftar dan kelola mata kuliah kurikulum Zyx Academy.",
};

export default async function AdminCoursesPage() {
  try {
    await assertAdmin();
  } catch {
    redirect("/");
  }

  const coursesList = await getCourses();

  return (
    <Reveal className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Button variant="ghost" size="xs" className="text-muted-foreground -ml-2 mb-1 gap-1" asChild>
          <Link href="/admin">
            <ArrowLeft className="size-3.5" aria-hidden />
            Admin home
          </Link>
        </Button>
        <h1 className="font-heading text-h4 font-semibold text-foreground">Kelola Mata Kuliah</h1>
        <p className="mt-1 text-body-sm text-muted-foreground">
          Kelola data kelas kurikulum, edit informasi deskripsi, atau tambahkan kelas baru ke sistem.
        </p>
      </div>

      <CoursesDashboard initialCourses={coursesList} />
    </Reveal>
  );
}