import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CourseSubNav } from "@/components/course/course-sub-nav";

type CourseLayoutChromeProps = {
  courseId: string;
  courseTitle: string;
};

export function CourseLayoutChrome({ courseId, courseTitle }: CourseLayoutChromeProps) {
  return (
    <div className="border-b border-border bg-background">
      <div className="marketing-container pt-8 md:pt-10">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-body-sm text-muted-foreground">
          <Link href="/courses" className="font-medium text-brand-primary underline-offset-4 hover:underline">
            Courses
          </Link>
          <ChevronRight className="size-4 shrink-0 opacity-60" aria-hidden />
          <span className="text-foreground">{courseTitle}</span>
        </nav>
        <div className="mt-6">
          <CourseSubNav courseId={courseId} courseTitle={courseTitle} />
        </div>
      </div>
    </div>
  );
}
