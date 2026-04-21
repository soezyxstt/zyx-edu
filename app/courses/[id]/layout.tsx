import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { CourseLayoutChrome } from "@/components/course/course-layout-chrome";
import { getCourseById } from "@/lib/student-course-fixtures";

type Props = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

export default async function CourseLayout({ children, params }: Props) {
  const { id } = await params;
  const course = getCourseById(id);
  if (!course) notFound();

  return (
    <>
      <CourseLayoutChrome courseId={course.id} courseTitle={course.title} />
      {children}
    </>
  );
}
