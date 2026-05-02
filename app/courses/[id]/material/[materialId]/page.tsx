import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { MaterialViewer } from "@/components/course/material-viewer";
import { pageTitle } from "@/lib/site";
import { getCourseById, getMaterial } from "@/lib/student-course-fixtures";

type Props = { params: Promise<{ id: string; materialId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, materialId } = await params;
  const course = getCourseById(id);
  const material = getMaterial(id, materialId);
  return {
    title: pageTitle(course && material ? `${course.title} — ${material.title}` : "Materi"),
    description: material?.title ?? "Materi course",
  };
}

export default async function CourseMaterialDetailPage({ params }: Props) {
  const { id, materialId } = await params;
  const course = getCourseById(id);
  const material = getMaterial(id, materialId);
  if (!course || !material) notFound();

  return (
    <CoursePageShell title={material.title} description={`${course.title} · materi pembelajaran`}>
      <MaterialViewer material={material} />
    </CoursePageShell>
  );
}
