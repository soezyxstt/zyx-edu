import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CourseSubNav } from "@/components/course/course-sub-nav";

type CourseLayoutChromeProps = {
  courseId: string;
  courseTitle: string;
};

export function CourseLayoutChrome({ courseId, courseTitle }: CourseLayoutChromeProps) {
  return (
    <div 
      className="sticky top-[56px] z-20 border-b border-border bg-background md:top-0 md:bg-background"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="marketing-container flex flex-col gap-1.5 py-1.5 md:flex-row md:items-center md:justify-between md:gap-2 md:py-2.5">
        <nav
          aria-label="Breadcrumb"
          className="hidden items-center gap-2 text-body-sm text-muted-foreground md:flex"
        >
          <Link
            href="/courses"
            className="font-semibold text-brand-primary underline-offset-4 transition-colors hover:underline"
          >
            Courses
          </Link>
          <ChevronRight className="size-4 shrink-0 opacity-50" aria-hidden />
          <span className="truncate font-medium text-foreground">{courseTitle}</span>
        </nav>
        <div className="w-full md:w-auto md:flex-1 md:flex md:justify-end">
          <CourseSubNav courseId={courseId} courseTitle={courseTitle} />
        </div>
      </div>
    </div>
  );
}
