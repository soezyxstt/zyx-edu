import type { Metadata } from "next";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { pageTitle } from "@/lib/site";
import { getCourseById, getMaterialsForCourse } from "@/lib/student-course-fixtures";
import { DocumentListClient } from "./document-list-client";
import { Reveal } from "@/components/ui/reveal";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const course = getCourseById(id);
  return {
    title: pageTitle(course ? `${course.title} — Dokumen` : "Dokumen"),
    description: "Daftar dokumen materi, berkas ujian, diktat, dan solusi kelas.",
  };
}

export default async function CourseMaterialListPage({ params }: Props) {
  const { id } = await params;
  const course = getCourseById(id);
  if (!course) return null;

  const materials = getMaterialsForCourse(id);

  return (
    <CoursePageShell
      eyebrow="Bahan Belajar"
      title="Dokumen & Materi Kuliah"
      description="Cari dan pelajari materi presentasi dosen, soal ujian tahun sebelumnya ITB, solusi pembahasan soal, dan diktat kuliah gratis."
    >
      <Reveal>
        <DocumentListClient courseId={id} materials={materials} />
      </Reveal>
    </CoursePageShell>
  );
}
