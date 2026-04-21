import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShellPage } from "@/components/shell-page";
import { MaterialViewer } from "@/components/course/material-viewer";
import { pageTitle } from "@/lib/site";
import { getCourseById, getMaterial } from "@/lib/student-course-fixtures";

type Props = { params: Promise<{ id: string; materialId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, materialId } = await params;
  const course = getCourseById(id);
  const material = getMaterial(id, materialId);
  return {
    title: pageTitle(
      course && material ? `${course.title} — ${material.title}` : "Materi",
    ),
    description: material?.title ?? "Materi course",
  };
}

export default async function CourseMaterialDetailPage({ params }: Props) {
  const { id, materialId } = await params;
  const course = getCourseById(id);
  const material = getMaterial(id, materialId);
  if (!course || !material) notFound();

  return (
    <ShellPage title={material.title} description={`${course.title} · materi pembelajaran`}>
      <MaterialViewer material={material} />
    </ShellPage>
  );
}
