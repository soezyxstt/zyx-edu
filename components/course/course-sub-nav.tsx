"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const segments = [
  { href: (id: string) => `/courses/${id}`, label: "Ringkasan", match: (path: string, id: string) => path === `/courses/${id}` },
  { href: (id: string) => `/courses/${id}/material`, label: "Materi", match: (path: string, id: string) => path.startsWith(`/courses/${id}/material`) },
  { href: (id: string) => `/courses/${id}/quiz`, label: "Kuis", match: (path: string, id: string) => path.startsWith(`/courses/${id}/quiz`) },
  { href: (id: string) => `/courses/${id}/tryout`, label: "Tryout", match: (path: string, id: string) => path.startsWith(`/courses/${id}/tryout`) },
  { href: (id: string) => `/courses/${id}/leaderboard`, label: "Papan peringkat", match: (path: string, id: string) => path.startsWith(`/courses/${id}/leaderboard`) },
  { href: (id: string) => `/courses/${id}/my-results`, label: "Hasil saya", match: (path: string, id: string) => path.startsWith(`/courses/${id}/my-results`) },
] as const;

type CourseSubNavProps = {
  courseId: string;
  courseTitle: string;
};

export function CourseSubNav({ courseId, courseTitle }: CourseSubNavProps) {
  const pathname = usePathname();

  return (
    <div className="border-b border-border">
      <nav aria-label="Navigasi course" className="-mb-px flex gap-1 overflow-x-auto pb-px md:flex-wrap">
        {segments.map((seg) => {
          const href = seg.href(courseId);
          const active = seg.match(pathname, courseId);
          return (
            <Link
              key={seg.label}
              href={href}
              className={cn(
                "shrink-0 rounded-t-lg px-3 py-2.5 text-body-sm font-medium transition-colors",
                active
                  ? "bg-card text-foreground shadow-[inset_0_-2px_0_0_var(--color-primary)]"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {seg.label}
            </Link>
          );
        })}
      </nav>
      <p className="sr-only">Course: {courseTitle}</p>
    </div>
  );
}
