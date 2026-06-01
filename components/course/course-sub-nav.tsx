"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Check,
  ChevronDown,
  LayoutDashboard,
  FileText,
  ClipboardList,
  GraduationCap,
  Trophy,
  History,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Segment {
  href: (id: string) => string;
  label: string;
  match: (path: string, id: string) => boolean;
  icon: LucideIcon;
}

const segments: Segment[] = [
  {
    href: (id: string) => `/courses/${id}`,
    label: "Ringkasan",
    match: (path: string, id: string) => path === `/courses/${id}`,
    icon: LayoutDashboard,
  },
  {
    href: (id: string) => `/courses/${id}/material`,
    label: "Dokumen",
    match: (path: string, id: string) => path.startsWith(`/courses/${id}/material`),
    icon: FileText,
  },
  {
    href: (id: string) => `/courses/${id}/quiz`,
    label: "Kuis",
    match: (path: string, id: string) => path.startsWith(`/courses/${id}/quiz`),
    icon: ClipboardList,
  },
  {
    href: (id: string) => `/courses/${id}/tryout`,
    label: "Tryout",
    match: (path: string, id: string) => path.startsWith(`/courses/${id}/tryout`),
    icon: GraduationCap,
  },
  {
    href: (id: string) => `/courses/${id}/leaderboard`,
    label: "Peringkat",
    match: (path: string, id: string) => path.startsWith(`/courses/${id}/leaderboard`),
    icon: Trophy,
  },
  {
    href: (id: string) => `/courses/${id}/my-results`,
    label: "Hasil",
    match: (path: string, id: string) => path.startsWith(`/courses/${id}/my-results`),
    icon: History,
  },
];

type CourseSubNavProps = {
  courseId: string;
  courseTitle: string;
};

export function CourseSubNav({ courseId, courseTitle }: CourseSubNavProps) {
  const pathname = usePathname();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const activeSegment = segments.find((seg) => seg.match(pathname, courseId)) ?? segments[0];
  const ActiveIcon = activeSegment.icon;

  useEffect(() => {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  }, [pathname]);

  return (
    <div className="relative">
      <nav aria-label="Navigasi course" className="flex">
        <details ref={detailsRef} className="group relative w-full max-w-80">
          <summary className="flex h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md border border-border bg-background px-3 text-body-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted/45 [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-2">
              <ActiveIcon className="size-4 shrink-0 text-brand-primary" aria-hidden />
              <span className="min-w-0 truncate">{activeSegment.label}</span>
            </span>
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-border bg-popover p-1.5 text-popover-foreground shadow-lg">
            {segments.map((seg) => {
              const href = seg.href(courseId);
              const active = seg.match(pathname, courseId);
              const Icon = seg.icon;
              return (
                <Link
                  key={seg.label}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-sm px-3 py-2.5 text-body-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-brand-primary"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Icon className={cn("size-4 shrink-0", active ? "text-brand-primary" : "text-muted-foreground")} aria-hidden />
                    <span>{seg.label}</span>
                  </span>
                  {active ? <Check className="size-4 shrink-0" aria-hidden /> : null}
                </Link>
              );
            })}
          </div>
        </details>
      </nav>
      <p className="sr-only">Course: {courseTitle}</p>
    </div>
  );
}
