import type { ReactNode } from "react";
import { StudentSidebar } from "@/components/student-sidebar";
import { CoursesAmbient } from "@/components/course/courses-ambient";
import { env } from "@/lib/env";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-row bg-landing-hero-shell overflow-x-clip">
      <CoursesAmbient />
      <StudentSidebar
        showStudyPath={env.FEATURE_STUDY_PATH === "1"}
        showMastery={env.FEATURE_MASTERY === "1"}
        showLive={env.FEATURE_LIVE === "1"}
      />
      <main
        id="main-content"
        tabIndex={-1}
        className="relative z-10 min-w-0 flex-1 focus:outline-none"
      >
        {children}
      </main>
    </div>
  );
}
