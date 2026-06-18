import type { ReactNode } from "react";
import { CoursesAmbient } from "@/components/course/courses-ambient";

export default function CoursesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-full flex-1 overflow-hidden bg-landing-hero-shell">
      <CoursesAmbient />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
