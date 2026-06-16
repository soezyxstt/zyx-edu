import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, GraduationCap, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageTitle } from "@/lib/site";
import { assertAdmin } from "@/lib/uploadthing-admin";
import { getCourses, getAllChapters, getUploadedMaterials } from "./actions";
import { CoursesDashboard } from "@/components/admin/courses-dashboard";
import { PDFMaterialsTab } from "@/components/admin/pdf-materials-tab";
import { Reveal } from "@/components/ui/reveal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const [coursesList, chaptersList, materialsList] = await Promise.all([
    getCourses(),
    getAllChapters(),
    getUploadedMaterials(),
  ]);

  return (
    <Reveal className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Button variant="ghost" size="xs" className="text-muted-foreground -ml-2 mb-1 gap-1" asChild>
          <Link href="/admin">
            <ArrowLeft className="size-3.5" aria-hidden />
            Admin home
          </Link>
        </Button>
        <h1 className="font-heading text-h4 font-semibold text-foreground">Kelola Mata Kuliah & Materi</h1>
        <p className="mt-1 text-body-sm text-muted-foreground">
          Kelola data kelas kurikulum, struktur bab belajar, dan unggah dokumen PDF manual.
        </p>
      </div>

      <Tabs defaultValue="courses" className="space-y-6">
        <TabsList className="bg-muted p-1 rounded-xl w-fit flex gap-1">
          <TabsTrigger value="courses" className="rounded-lg font-semibold flex items-center gap-1.5 px-4 py-2">
            <GraduationCap className="size-4" />
            Kelola Mata Kuliah
          </TabsTrigger>
          <TabsTrigger value="pdf-materials" className="rounded-lg font-semibold flex items-center gap-1.5 px-4 py-2">
            <FileText className="size-4" />
            Unggah PDF (Materi & Soal)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="outline-hidden">
          <CoursesDashboard initialCourses={coursesList} />
        </TabsContent>

        <TabsContent value="pdf-materials" className="outline-hidden">
          <PDFMaterialsTab
            courses={coursesList}
            chapters={chaptersList}
            initialMaterials={materialsList}
          />
        </TabsContent>
      </Tabs>
    </Reveal>
  );
}