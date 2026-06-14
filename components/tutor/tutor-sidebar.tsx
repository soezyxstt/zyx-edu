"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut } from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export function TutorSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: left sidebar */}
      <aside className="max-md:hidden sticky top-0 h-screen w-56 shrink-0 flex flex-col border-r border-border bg-card z-40">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-border shrink-0">
          <Link href="/" aria-label="Kembali ke beranda">
            <Logo className="[--logo-height:1.75rem]" />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Teaching navigation">
          <Link
            href="/tutor"
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-body-sm font-medium transition-colors duration-150",
              pathname === "/tutor"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <LayoutDashboard className="size-4 shrink-0" aria-hidden />
            My courses
          </Link>
        </nav>

        {session?.user && (
          <div className="p-3 border-t border-border shrink-0 space-y-1">
            <p className="px-3 py-1 text-body-sm font-medium text-foreground truncate">
              {session.user.name || session.user.email}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => void signOut()}
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </Button>
          </div>
        )}
      </aside>

      {/* Mobile: sticky top bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 py-3 w-full shrink-0">
        <Link href="/tutor" aria-label="My courses">
          <Logo className="[--logo-height:1.5rem]" />
        </Link>
        <span className="text-body-sm font-medium text-muted-foreground">Teaching</span>
      </div>
    </>
  );
}
