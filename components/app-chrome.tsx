"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { NavScrollProvider } from "@/components/nav-scroll-provider";
import { SiteMain } from "@/components/site-main";
import { Footer } from "@/components/footer";
import { CommandMenuProvider } from "@/components/command-menu";
import { StudentSidebar } from "@/components/student-sidebar";
import { useSession } from "@/lib/auth-client";

import { CoursesAmbient } from "@/components/course/courses-ambient";
import { TutorProvider } from "@/components/course/tutor-drawer";

function isAdminPath(pathname: string | null) {
  return pathname !== null && /^\/admin(?:\/|$)/.test(pathname);
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as { id: string; role?: string | null } | undefined;

  const isStudentLayout =
    pathname !== null &&
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/settings") ||
      (pathname.startsWith("/courses") && user && user.role !== "admin"));

  return (
    <TutorProvider>
      <CommandMenuProvider>
        {isAdminPath(pathname) ? (
          <div className="relative flex min-h-screen flex-col bg-landing-hero-shell overflow-hidden md:flex-row">
            <CoursesAmbient />
            <AdminSidebar />
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
           * Student layout — two modes:
           *
           * Mobile (< md):
           *   flex-col → [mobile topbar h-14] + [main flex-1]
           *   Sidebar rendered as <dialog> outside normal flow
           *
           * Desktop (≥ md):
           *   flex-row → [sticky sidebar w-248] + [main flex-1]
           *   Sidebar uses position:sticky + height:100svh
           *
           * No overflow:hidden / h-dvh on the wrapper —
           * let the browser handle scrolling naturally.
           */
          <div className="relative flex min-h-screen flex-col bg-landing-hero-shell overflow-x-hidden md:flex-row">
            <CoursesAmbient />
            <StudentSidebar />
            <main
              id="main-content"
              tabIndex={-1}
              className="relative z-10 min-w-0 flex-1 focus:outline-none"
            >
              {children}
            </main>
          </div>
        ) : (
          <NavScrollProvider>
            <Navbar />
            <SiteMain>{children}</SiteMain>
            <Footer />
          </NavScrollProvider>
        )}
      </CommandMenuProvider>
    </TutorProvider>
  );
}
