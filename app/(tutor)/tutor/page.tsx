import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ArrowRight } from "lucide-react";
import { getTutorCourseList } from "@/lib/cohort-analytics";
import { pageTitle } from "@/lib/site";

export const metadata: Metadata = {
  title: pageTitle("Teaching"),
  description: "Analitik cohort dan manajemen kelas untuk tutor Zyx Academy.",
};

export default async function TutorPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const role = (session.user as { role?: string | null }).role;
  const isAdmin = role === "admin";

  const courseList = await getTutorCourseList(session.user.id, isAdmin);

  return (
    <div className="px-6 py-8 max-w-2xl">
      <h1 className="text-h4 font-heading font-bold mb-1">Teaching</h1>
      <p className="text-body-sm text-muted-foreground mb-8">
        Select a course to view cohort analytics.
      </p>

      {courseList.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">No courses assigned.</p>
      ) : (
        <div className="divide-y divide-border">
          {courseList.map((course) => (
            <Link
              key={course.courseId}
              href={`/tutor/${course.courseId}`}
              className="py-4 flex items-center justify-between gap-4 hover:bg-muted/40 rounded-lg px-3 -mx-3 transition-colors duration-150"
            >
              <div className="min-w-0">
                <p className="text-body-base font-medium truncate">{course.title}</p>
                <p className="text-body-sm text-muted-foreground">{course.enrolledCount} enrolled</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
