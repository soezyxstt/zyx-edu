"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { AdminNavbar } from "@/components/admin-navbar";
import { NavScrollProvider } from "@/components/nav-scroll-provider";
import { SiteMain } from "@/components/site-main";
import { Footer } from "@/components/footer";
import { CommandMenuProvider } from "@/components/command-menu";
import { StudentSidebar } from "@/components/student-sidebar";
import { useSession } from "@/lib/auth-client";

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
    <CommandMenuProvider>
      {isAdminPath(pathname) ? (
        <>
          <AdminNavbar />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 scroll-mt-[calc(4.5rem+1px)] pt-[calc(4.5rem+1px)] outline-none"
          >
            {children}
          </main>
        </>
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
        <div className="flex min-h-screen flex-col bg-background md:flex-row">
          <StudentSidebar />
          <main
            id="main-content"
            tabIndex={-1}
            className="min-w-0 flex-1 focus:outline-none"
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
  );
}
