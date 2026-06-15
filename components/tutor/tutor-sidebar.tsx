"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Play,
  BookOpen,
  ClipboardList,
  Trophy,
  CheckSquare,
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
   TutorSidebar
   ───────────────────────────────────────────────────────────────── */
export function TutorSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { setOpen: setSearchOpen } = useCommandMenu();

  // Extract courseId from path (e.g. /tutor/[courseId] or /courses/[courseId]/...)
  const parts = pathname.split("/");
  let courseId: string | undefined = undefined;
  if (parts[1] === "tutor" && parts[2]) {
    courseId = parts[2];
  } else if (parts[1] === "courses" && parts[2]) {
    courseId = parts[2];
  }

  // Default to collapsed on mobile (small screens), expanded on desktop
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("tutor-sidebar-collapsed");
    if (stored !== null) return stored === "true";
    return window.innerWidth < 768;
  });

  const [mounted, setMounted] = useState(false);
  const [modKeyHint, setModKeyHint] = useState("Ctrl + K");

  useEffect(() => {
    setMounted(true);
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    setModKeyHint(/Mac|iPhone|iPod|iPad/i.test(ua) ? "⌘K" : "Ctrl + K");
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem("tutor-sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/";
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
      collapsed && "justify-center px-0 size-10 mx-auto",
      className
    );

    const content = (
      <>
        <Icon className="size-5 shrink-0" />
        {!collapsed && <span>{label}</span>}
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
      <SidebarTooltip label={label} collapsed={collapsed}>
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
    <aside
      style={{ position: "sticky", top: 0, height: "100svh" }}
      className={cn(
        "flex flex-col shrink-0 overflow-hidden z-30",
        "border-r border-border bg-card",
        "transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[64px]" : "w-[248px]"
      )}
    >
      {/* Header row: brand + collapse toggle */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3">
        {!collapsed && (
          <Link href="/tutor" aria-label="My courses" className="flex items-center">
            <Logo className="[--logo-height:1.75rem]" />
          </Link>
        )}
        <SidebarTooltip label={collapsed ? "Expand sidebar" : "Collapse sidebar"} collapsed={collapsed}>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground transition-colors",
              collapsed && "mx-auto"
            )}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </SidebarTooltip>
      </div>

      {/* User Card */}
      <div className="shrink-0">
        {mounted && <UserCard c={collapsed} />}
      </div>

      {/* Search trigger */}
      <div className="px-3 pt-3 shrink-0">
        <SidebarTooltip label={`Search  ${modKeyHint}`} collapsed={collapsed}>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-muted-foreground transition-all hover:bg-muted/70 hover:text-foreground cursor-pointer",
              collapsed ? "size-10 mx-auto px-0" : "w-full"
            )}
          >
            <Search className="size-4 shrink-0" />
            {!collapsed && (
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
          collapsed
            ? "px-1 items-center overflow-y-hidden sidebar-scroll-hidden"
            : "px-3 overflow-y-auto sidebar-scroll"
        )}
      >
        <NavItem
          href="/tutor"
          icon={LayoutDashboard}
          label="My courses"
          active={pathname === "/tutor"}
        />

        {courseId && (
          <>
            {!collapsed && (
              <>
                <div className="h-px bg-border/50 my-3 shrink-0 w-full" />
                <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-sans">
                  Kelas Aktif
                </p>
              </>
            )}
            {collapsed && <div className="h-px bg-border/50 my-2 shrink-0 w-full" />}

            <NavItem
              href={`/tutor/${courseId}`}
              icon={LayoutDashboard}
              label="Dashboard Kelas"
              active={pathname === `/tutor/${courseId}`}
            />

            <NavItem
              href={`/tutor/${courseId}/materials`}
              icon={BookOpen}
              label="Kelola Materi"
              active={pathname.includes("/materials")}
            />

            <NavItem
              href={`/tutor/${courseId}/quizzes`}
              icon={ClipboardList}
              label="Kelola Kuis"
              active={pathname.includes("/quizzes")}
            />

            <NavItem
              href={`/tutor/${courseId}/tryouts`}
              icon={Trophy}
              label="Kelola Tryout"
              active={pathname.includes("/tryouts")}
            />

            <NavItem
              href={`/tutor/${courseId}/grading`}
              icon={CheckSquare}
              label="Penilaian Tryout"
              active={pathname.includes("/grading")}
            />

            <NavItem
              href={`/courses/${courseId}/live/host`}
              icon={Play}
              label="Live Quiz Console"
              active={pathname.includes("/live/host")}
            />
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sign out */}
        <NavItem
          icon={LogOut}
          label="Keluar"
          onClick={handleLogout}
          className="text-status-error hover:bg-status-error/10 hover:text-status-error"
        />
      </nav>
    </aside>
  );
}
