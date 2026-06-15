"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { SiteMain } from "@/components/site-main";
import { Footer } from "@/components/footer";
import { CommandMenuProvider } from "@/components/command-menu";
import { StudentSidebar } from "@/components/student-sidebar";
import { TutorSidebar } from "@/components/tutor/tutor-sidebar";
import { useSession } from "@/lib/auth-client";

import { CoursesAmbient } from "@/components/course/courses-ambient";
import { TutorProvider } from "@/components/course/tutor-drawer";

function isAdminPath(pathname: string | null) {
  return pathname !== null && /^\/admin(?:\/|$)/.test(pathname);
}

function isTutorPath(pathname: string | null) {
  return pathname !== null && /^\/tutor(?:\/|$)/.test(pathname);
}

interface AppChromeProps {
  children: React.ReactNode;
  showStudyPath?: boolean;
  showMastery?: boolean;
  showLive?: boolean;
}

export function AppChrome({
  children,
  showStudyPath = false,
  showMastery = false,
  showLive = false,
}: AppChromeProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as { id: string; role?: string | null } | undefined;

  const isStudentLayout =
    pathname !== null &&
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/leaderboard") ||
      (pathname.startsWith("/courses") && !!user)) &&
    !isTutorPath(pathname);

  return (
    <TutorProvider>
      <CommandMenuProvider>
        {isAdminPath(pathname) ? (
          <div className="relative flex min-h-screen flex-row bg-background">
            <AdminSidebar />
            <main
              id="main-content"
              tabIndex={-1}
              className="relative z-10 min-w-0 flex-1 focus:outline-none"
            >
              {children}
            </main>
          </div>
        ) : isTutorPath(pathname) ? (
          <div className="relative flex min-h-screen flex-row bg-landing-hero-shell [overflow-x:clip]">
            <TutorSidebar />
            <main
              id="main-content"
              tabIndex={-1}
              className="relative z-10 min-w-0 flex-1 focus:outline-none"
            >
              {children}
            </main>
          </div>
        ) : isStudentLayout ? (
          /*
           * Student layout — persistent sidebar (always visible):
           *   flex-row at all screen sizes
           *   Collapsed (64px icon rail) ↔ Expanded (248px with labels)
           *   Main content flexes to fill remaining space naturally.
           */
          <div className="relative flex min-h-screen flex-row bg-landing-hero-shell [overflow-x:clip]">
            <CoursesAmbient />
            <StudentSidebar
              showStudyPath={showStudyPath}
              showMastery={showMastery}
              showLive={showLive}
            />
            <main
              id="main-content"
              tabIndex={-1}
              className="relative z-10 min-w-0 flex-1 focus:outline-none"
            >
              {children}
            </main>
          </div>
        ) : (
          <>
            <Navbar />
            <SiteMain>{children}</SiteMain>
            <Footer />
          </>
        )}
      </CommandMenuProvider>
    </TutorProvider>
  );
}
