"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { AdminNavbar } from "@/components/admin-navbar";
import { NavScrollProvider } from "@/components/nav-scroll-provider";
import { SiteMain } from "@/components/site-main";
import { Footer } from "@/components/footer";
import { CommandMenuProvider } from "@/components/command-menu";

function isAdminPath(pathname: string | null) {
  return pathname !== null && /^\/admin(?:\/|$)/.test(pathname);
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
