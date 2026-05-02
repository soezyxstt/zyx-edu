import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CourseSubNav } from "@/components/course/course-sub-nav";

type CourseLayoutChromeProps = {
  courseId: string;
  courseTitle: string;
};

export function CourseLayoutChrome({ courseId, courseTitle }: CourseLayoutChromeProps) {
  return (
    <div className="border-b border-border/80 bg-background/60 backdrop-blur-md">
      <div className="marketing-container pt-8 md:pt-10">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-body-sm text-muted-foreground"
        >
          <Link
            href="/courses"
            className="rounded-full bg-muted/70 px-3 py-1 font-medium text-foreground ring-1 ring-border/60 transition-colors hover:bg-muted hover:text-foreground"
          >
            Courses
          </Link>
          <ChevronRight className="size-4 shrink-0 opacity-50" aria-hidden />
          <span className="font-medium text-foreground">{courseTitle}</span>
        </nav>
        <div className="mt-6">
          <CourseSubNav courseId={courseId} courseTitle={courseTitle} />
        </div>
      </div>
    </div>
  );
}
