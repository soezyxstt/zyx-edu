import type { Metadata } from "next";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { pageTitle } from "@/lib/site";
import { getCourseById, getExamsForCourse } from "@/lib/student-course-fixtures";
import { checkEnrollment } from "@/app/dashboard/actions";
import { TryoutListClient } from "./tryout-list-client";
import { Reveal } from "@/components/ui/reveal";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const course = getCourseById(id);
  return {
    title: pageTitle(course ? `${course.title} — Tryout` : "Tryout"),
    description: "Daftar tryout course",
  };
}

export default async function CourseTryoutListPage({ params }: Props) {
  const { id } = await params;
  const course = getCourseById(id);
  if (!course) return null;

  const isEnrolled = await checkEnrollment(id);
  const tryouts = getExamsForCourse(id, "tryout");

  return (
    <CoursePageShell
      eyebrow="Simulasi"
      title="Tryout"
      description={!isEnrolled ? "Aktifkan token untuk membuka tryout." : undefined}
      hideHeader
    >
      <Reveal>
        <TryoutListClient courseId={id} isEnrolled={isEnrolled} tryouts={tryouts} />
      </Reveal>
    </CoursePageShell>
  );
}
