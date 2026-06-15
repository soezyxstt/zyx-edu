import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { checkEnrollment } from "@/app/dashboard/actions";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { EnrollmentForm } from "@/components/enrollment-form";
import { Reveal } from "@/components/ui/reveal";
import { pageTitle } from "@/lib/site";
import { getCourseById } from "@/lib/student-course-fixtures";
import { StudyPathTimeline } from "@/components/course/study-path-timeline";
import { env } from "@/lib/env";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const course = getCourseById(id);
  return {
    title: pageTitle(course ? `${course.title} - Alur Belajar` : "Alur Belajar"),
    description: course?.description ?? "Rencana alur belajar personal",
  };
}

export default async function CoursePathPage({ params }: Props) {
  if (env.FEATURE_STUDY_PATH !== "1") {
    notFound();
  }

  const { id } = await params;
  const course = getCourseById(id);
  if (!course) notFound();

  const isEnrolled = await checkEnrollment(id);

  if (!isEnrolled) {
    return (
      <CoursePageShell>
        <Reveal>
          <div className="mx-auto max-w-xl text-center py-12">
            <h3 className="font-heading text-body-lg font-bold text-foreground">Alur Belajar Terkunci</h3>
            <p className="mt-2 text-body-sm text-muted-foreground leading-relaxed">
              Anda perlu mendaftar kelas ini untuk melihat alur belajar personal Anda. Aktifkan kelas menggunakan token pendaftaran di bawah ini.
            </p>
            <div className="mt-6 flex justify-center">
              <EnrollmentForm className="w-full max-w-sm" />
            </div>
          </div>
        </Reveal>
      </CoursePageShell>
    );
  }

  return (
    <CoursePageShell>
      <StudyPathTimeline courseId={id} />
    </CoursePageShell>
  );
}
