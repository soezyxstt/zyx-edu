import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CoursePageShell } from "@/components/course/course-page-shell";
import { pageTitle } from "@/lib/site";
import { checkEnrollment } from "@/app/dashboard/actions";
import { FlashcardClient } from "./flashcard-client";
import { Reveal } from "@/components/ui/reveal";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getReviewQueue } from "@/lib/flashcard-actions";
import { EnrollmentForm } from "@/components/enrollment-form";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [course] = await db
    .select({ title: courses.title })
    .from(courses)
    .where(eq(courses.id, id))
    .limit(1);

  return {
    title: pageTitle(course ? `${course.title} - Flashcard` : "Flashcard"),
    description: "Spaced repetition study deck for course concepts",
  };
}

export default async function CourseFlashcardPage({ params }: Props) {
  const { id } = await params;

  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, id))
    .limit(1);

  if (!course) notFound();

  const isEnrolled = await checkEnrollment(id);

  // Retrieve user session
  const session = await auth.api.getSession({ headers: await headers() });
  const studentId = session?.user?.id;

  let queue: any[] = [];
  if (studentId && isEnrolled) {
    try {
      queue = await getReviewQueue(studentId, id);
    } catch (error) {
      console.error("Error fetching flashcard queue:", error);
    }
  }

  return (
    <CoursePageShell
      eyebrow={
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-widest">
          <Link href="/courses" className="hover:text-primary transition-colors">Katalog</Link>
          <ChevronRight className="size-3" />
          <Link href={`/courses/${id}`} className="hover:text-primary transition-colors">{course.title}</Link>
        </div>
      }
      title="Flashcard Review"
      description="Gunakan kartu pengulangan berjeda (spaced repetition) untuk mematangkan ingatan konsep inti Anda."
      hideHeader
    >
      <Reveal>
        {!isEnrolled ? (
          <div className="mx-auto max-w-2xl rounded-2xl border border-border/60 bg-card p-6 shadow-sm text-center">
            <h3 className="font-heading text-body-lg font-bold text-foreground">
              Akses Terkunci
            </h3>
            <p className="mt-2 text-body-sm text-muted-foreground mb-6">
              Silakan aktifkan kelas ini menggunakan token pendaftaran Anda untuk mulai berlatih dengan flashcard.
            </p>
            <EnrollmentForm className="mx-auto max-w-md text-left" />
          </div>
        ) : (
          <FlashcardClient
            courseId={id}
            initialQueue={queue}
            studentId={studentId || ""}
          />
        )}
      </Reveal>
    </CoursePageShell>
  );
}
