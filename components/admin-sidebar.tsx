"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  KeyRound,
  BookText,
  Archive,
  Zap,
  ListChecks,
  ClipboardList,
  GraduationCap,
  LogOut,
  Search,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { useCommandMenu } from "@/components/command-menu";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

/* ─────────────────────────────────────────────────────────────────
   SidebarTooltip
   ───────────────────────────────────────────────────────────────── */
function SidebarTooltip({
  label,
  children,
  collapsed,
}: {
  label: string;
  children: React.ReactNode;
  collapsed: boolean;
}) {
  if (!collapsed) return <>{children}</>;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ─────────────────────────────────────────────────────────────────
   AdminSidebar
   ───────────────────────────────────────────────────────────────── */
export function AdminSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { setOpen: setSearchOpen } = useCommandMenu();

  // Initialize to safe defaults to prevent server/client hydration mismatch
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [modKeyHint, setModKeyHint] = useState("Ctrl + K");

  useEffect(() => {
    setMounted(true);
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    setModKeyHint(/Mac|iPhone|iPod|iPad/i.test(ua) ? "⌘K" : "Ctrl + K");

    // Retrieve storage or screen layout status after mounting
    const stored = localStorage.getItem("admin-sidebar-collapsed");
    if (stored !== null) {
      setCollapsed(stored === "true");
    } else {
      setCollapsed(window.innerWidth < 768);
    }

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isCollapsed = isMobile ? false : collapsed;

  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [mobileOpen]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem("admin-sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/";
  };

  const isLinkActive = (href: string) => {
    return pathname === href || (href !== "/admin" && pathname.startsWith(href));
  };

  /* ── Nav item helper ──────────────────────────────── */
  const NavItem = ({
    href,
    icon: Icon,
    label,
    active,
    onClick,
    className,
  }: {
    href?: string;
    icon: React.ElementType;
    label: string;
    active?: boolean;
    onClick?: (e: React.MouseEvent) => void;
    className?: string;
  }) => {
    const baseClass = cn(
      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm font-medium transition-colors w-full",
      active
        ? "bg-brand-primary/10 text-brand-primary font-semibold"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
      isCollapsed && "justify-center px-0 size-10 mx-auto",
      className
    );

    const content = (
      <>
        <Icon className="size-5 shrink-0" />
        {!isCollapsed && <span>{label}</span>}
      </>
    );

    const inner = href ? (
      <Link href={href} onClick={onClick as undefined} className={baseClass}>
        {content}
      </Link>
    ) : (
      <button type="button" onClick={onClick} className={cn(baseClass, "cursor-pointer")}>
        {content}
      </button>
    );

    return (
      <SidebarTooltip label={label} collapsed={isCollapsed}>
        {inner}
      </SidebarTooltip>
    );
  };

  const UserCard = ({ c = false }: { c?: boolean }) => {
    if (!session?.user) return null;
    const cardContent = (
      <div
        className={cn(
          "mx-3 mt-3 flex shrink-0 items-center gap-3 rounded-xl border border-border/70 bg-muted/40 p-2.5 transition-all duration-300",
          c && "justify-center p-1.5 mx-auto size-10"
        )}
      >
        {session.user.image ? (
          <img
            src={session.user.image}
            alt={session.user.name}
            className="size-7 shrink-0 rounded-full object-cover ring-2 ring-brand-primary/20"
          />
        ) : (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-white">
            {session.user.name?.charAt(0)?.toUpperCase() ?? "?"}
          </span>
        )}
        {!c && (
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-body-xs font-semibold text-foreground">
              {session.user.name}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {session.user.email}
            </p>
          </div>
        )}
      </div>
    );

    return (
      <SidebarTooltip label={`${session.user.name} (${session.user.email})`} collapsed={c}>
        {cardContent}
      </SidebarTooltip>
    );
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mounted && (
        <div
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
            opacity: mobileOpen ? 1 : 0,
            pointerEvents: mobileOpen ? "auto" : "none",
            transition: "opacity 300ms ease-in-out, backdrop-filter 300ms ease-in-out"
          }}
          className="fixed inset-0 z-40 md:hidden cursor-pointer"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Floating Trigger Button */}
      {mounted && (
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground shadow-sm fixed top-3 left-3 z-40 md:hidden"
        >
          <PanelLeftOpen className="size-4" />
        </button>
      )}

      <aside
        ref={sidebarRef}
        style={{
          top: 0,
          height: "100svh",
          transform: mobileOpen ? "translateX(0)" : undefined
        }}
        className={cn(
          "flex flex-col shrink-0 overflow-hidden",
          "border-r border-border bg-card",
          "transition-transform duration-300 ease-in-out",
          // Mobile sheet mode - starts translated off-screen, width clamped
          "fixed inset-y-0 left-0 z-50 shadow-xl w-[clamp(248px,80vw,300px)] -translate-x-full",
          // Desktop persistent mode - sticky, translated to 0, no shadow, custom width
          "md:sticky md:translate-x-0 md:z-30 md:shadow-none",
          isCollapsed ? "md:w-[64px]" : "md:w-[248px]"
        )}
      >
        {/* Header row: brand + collapse toggle */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3">
          {!isCollapsed && (
            <Link href="/admin" aria-label="Panel Admin Zyx Academy" className="flex items-center">
              <Logo className="[--logo-height:1.75rem]" />
            </Link>
          )}
          <SidebarTooltip label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} collapsed={isCollapsed}>
            <button
              type="button"
              onClick={isMobile ? () => setMobileOpen(false) : toggleCollapsed}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground transition-colors",
                isCollapsed && "mx-auto"
              )}
            >
              {isCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </button>
          </SidebarTooltip>
        </div>

        {/* User Card */}
        <div className="shrink-0">
          {mounted && <UserCard c={isCollapsed} />}
        </div>

        {/* Search trigger */}
        <div className="px-3 pt-3 shrink-0">
          <SidebarTooltip label={`Search  ${modKeyHint}`} collapsed={isCollapsed}>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-muted-foreground transition-all hover:bg-muted/70 hover:text-foreground cursor-pointer",
                isCollapsed ? "size-10 mx-auto px-0" : "w-full"
              )}
            >
              <Search className="size-4 shrink-0" />
              {!isCollapsed && (
                <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border text-[10px] font-mono leading-none font-semibold">
                  {modKeyHint}
                </kbd>
              )}
            </button>
          </SidebarTooltip>
        </div>

        {/* Navigation */}
        <nav
          className={cn(
            "flex flex-1 flex-col gap-1 py-4 font-sans text-left",
            isCollapsed
              ? "px-1 items-center overflow-y-hidden sidebar-scroll-hidden"
              : "px-3 overflow-y-auto sidebar-scroll"
          )}
        >
          <NavItem
            href="/admin"
            icon={LayoutDashboard}
            label="Panel Admin"
            active={isLinkActive("/admin")}
          />

          <NavItem
            href="/admin/files"
            icon={FolderOpen}
            label="File Storage"
            active={isLinkActive("/admin/files")}
          />

          <NavItem
            href="/admin/tokens"
            icon={KeyRound}
            label="Token Aktivasi"
            active={isLinkActive("/admin/tokens")}
          />

          <NavItem
            href="/admin/ai/materials"
            icon={BookText}
            label="Materi AI"
            active={isLinkActive("/admin/ai/materials")}
          />

          <NavItem
            href="/admin/ai/diktats"
            icon={Archive}
            label="Kompilasi Diktat"
            active={isLinkActive("/admin/ai/diktats")}
          />

          <NavItem
            href="/admin/ai/jobs"
            icon={Zap}
            label="Generasi Soal"
            active={isLinkActive("/admin/ai/jobs")}
          />

          <NavItem
            href="/admin/ai/questions"
            icon={ListChecks}
            label="Bank Soal"
            active={isLinkActive("/admin/ai/questions")}
          />

          <NavItem
            href="/admin/ai/quizzes"
            icon={ClipboardList}
            label="Template Kuis"
            active={isLinkActive("/admin/ai/quizzes")}
          />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Beranda Siswa */}
          <NavItem
            href="/dashboard"
            icon={GraduationCap}
            label="Beranda Siswa"
            className="text-brand-secondary hover:bg-brand-secondary/10 hover:text-brand-secondary font-semibold"
          />

          {/* Sign out */}
          <NavItem
            icon={LogOut}
            label="Keluar"
            onClick={handleLogout}
            className="text-status-error hover:bg-status-error/10 hover:text-status-error"
          />
        </nav>
      </aside>
    </>
  );
}
