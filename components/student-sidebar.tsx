"use client";

/* eslint-disable react-hooks/static-components */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  Search,
  CalendarRange,
  Trophy,
  ArrowLeft,
  Compass,
  FileText,
  Brain,
  ClipboardList,
  GraduationCap,
  Play,
  Target,
  History,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { getStudentEnrollments } from "@/app/dashboard/actions";
import { getCourseById } from "@/lib/student-course-fixtures";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { useCommandMenu } from "@/components/command-menu";
import { StreakCalendarStrip } from "@/components/dashboard/streak-calendar-strip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* ─────────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────────── */
interface NavOptions {
  collapsed?: boolean;
}

type StudentEnrollment = Awaited<ReturnType<typeof getStudentEnrollments>>[number];

interface StudentSidebarProps {
  showStudyPath?: boolean;
  showMastery?: boolean;
  showLive?: boolean;
}

/* ─────────────────────────────────────────────────────────────────
   SidebarTooltip — powered by Shadcn UI tooltip component
   when the sidebar is collapsed
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
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side="right">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ─────────────────────────────────────────────────────────────────
   StudentSidebar — always-visible persistent sidebar
   Collapsed  : 64px icon rail with tooltip popovers
   Expanded   : 248px with labels — main view shrinks via flex
 ───────────────────────────────────────────────────────────────── */
export function StudentSidebar({
  showStudyPath = false,
  showMastery = false,
  showLive = false,
}: StudentSidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { setOpen: setSearchOpen } = useCommandMenu();
  const courseIdFromPath = pathname.startsWith("/courses/")
    ? pathname.split("/")[2]
    : undefined;
  const activeCourse = courseIdFromPath ? getCourseById(courseIdFromPath) : undefined;

  // Default to collapsed on mobile (small screens), expanded on desktop
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored !== null) return stored === "true";
    return window.innerWidth < 768;
  });

  const [coursesOpen, setCoursesOpen] = useState(true);
  const [enrolledCourses, setEnrolledCourses] = useState<StudentEnrollment[]>([]);
  const [modKeyHint, setModKeyHint] = useState("Ctrl + K");
  const [mounted, setMounted] = useState(false);
  const [streakCurrent, setStreakCurrent] = useState<number | null>(null);
  const [weeklyActivity, setWeeklyActivity] = useState<boolean[]>([]);

  useEffect(() => {
    setMounted(true);
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    setModKeyHint(/Mac|iPhone|iPod|iPad/i.test(ua) ? "⌘K" : "Ctrl + K");
  }, []);

  // Persist collapse state
  const toggleCollapsed = useCallback(() => {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  /* ── Data ─────────────────────────────────────────── */
  useEffect(() => {
    if (session?.user?.id) {
      getStudentEnrollments().then(setEnrolledCourses).catch(console.error);
      fetch("/api/student/today")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.streak?.current != null) setStreakCurrent(d.streak.current);
          if (d?.weeklyActivity != null) setWeeklyActivity(d.weeklyActivity);
        })
        .catch(() => {});
    }
  }, [session?.user?.id]);

  /* ── Handlers ─────────────────────────────────────── */
  const handleLogout = async () => {
    await signOut();
    window.location.href = "/";
  };

  const handleCoursesToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    if (collapsed) {
      router.push("/courses");
    } else {
      setCoursesOpen((v) => !v);
    }
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

  /* ── Shared nav markup ────────────────────────────── */
  const Nav = ({ collapsed: c = false }: NavOptions) => {

    if (activeCourse) {
      return (
        <nav className={cn(
          "flex flex-1 flex-col gap-1 py-4 font-sans text-left",
          c
            ? "px-1 items-center overflow-y-hidden sidebar-scroll-hidden"
            : "px-3 overflow-y-auto sidebar-scroll"
        )}>
          {/* Back button */}
          <SidebarTooltip label="Kembali ke Dashboard" collapsed={c}>
            <Link
              href="/dashboard"
              title={c ? "Kembali ke Dashboard" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-body-xs font-semibold text-brand-secondary hover:bg-muted/40 transition-colors mb-2",
                c && "justify-center size-10 px-0 mx-auto"
              )}
            >
              <ArrowLeft className="size-4 shrink-0" />
              {!c && <span>Dashboard</span>}
            </Link>
          </SidebarTooltip>

          {/* Active Course Card (expanded only) */}
          {!c && (
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 mb-4 text-left">
              <div className="flex items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                  <BookOpen className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-xs font-bold text-foreground font-heading leading-tight">
                    {activeCourse.title}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">
                    {activeCourse.category || "Kelas"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Course segments */}
          <div className={cn("space-y-1", c && "w-full flex flex-col items-center")}>
            <NavItem
              href={`/courses/${activeCourse.id}`}
              icon={LayoutDashboard}
              label="Ringkasan"
              active={pathname === `/courses/${activeCourse.id}`}
            />

            {showStudyPath && (
              <NavItem
                href={`/courses/${activeCourse.id}/path`}
                icon={Compass}
                label="Alur Belajar"
                active={pathname.startsWith(`/courses/${activeCourse.id}/path`)}
              />
            )}

            <NavItem
              href={`/courses/${activeCourse.id}/material`}
              icon={FileText}
              label="Dokumen"
              active={pathname.startsWith(`/courses/${activeCourse.id}/material`)}
            />

            <NavItem
              href={`/courses/${activeCourse.id}/flashcard`}
              icon={Brain}
              label="Flashcard"
              active={pathname.startsWith(`/courses/${activeCourse.id}/flashcard`)}
            />

            <NavItem
              href={`/courses/${activeCourse.id}/quiz`}
              icon={ClipboardList}
              label="Kuis"
              active={pathname.startsWith(`/courses/${activeCourse.id}/quiz`)}
            />

            <NavItem
              href={`/courses/${activeCourse.id}/tryout`}
              icon={GraduationCap}
              label="Tryout"
              active={pathname.startsWith(`/courses/${activeCourse.id}/tryout`)}
            />

            {showLive && (
              <NavItem
                href={`/courses/${activeCourse.id}/live`}
                icon={Play}
                label="Kuis Langsung"
                active={pathname.startsWith(`/courses/${activeCourse.id}/live`)}
              />
            )}

            {showMastery && (
              <NavItem
                href={`/courses/${activeCourse.id}/mastery`}
                icon={Target}
                label="Penguasaan"
                active={pathname.startsWith(`/courses/${activeCourse.id}/mastery`)}
              />
            )}

            <NavItem
              href={`/courses/${activeCourse.id}/leaderboard`}
              icon={Trophy}
              label="Peringkat"
              active={pathname.startsWith(`/courses/${activeCourse.id}/leaderboard`)}
            />

            <NavItem
              href={`/courses/${activeCourse.id}/my-results`}
              icon={History}
              label="Hasil Ujian"
              active={pathname.startsWith(`/courses/${activeCourse.id}/my-results`)}
            />
          </div>

          <div className="h-px bg-border/50 my-3 shrink-0 w-full" />

          <div className="flex-1" />

          {/* Streak calendar strip inside course (expanded only) */}
          {!c && streakCurrent !== null && (
            <div className="pb-1">
              <StreakCalendarStrip current={streakCurrent} weeklyActivity={weeklyActivity} />
            </div>
          )}

          {/* Sign out */}
          <SidebarTooltip label="Keluar" collapsed={c}>
            <button
              type="button"
              onClick={handleLogout}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm font-medium text-status-error transition-colors hover:bg-status-error/10 cursor-pointer",
                c && "justify-center size-10 px-0 mx-auto"
              )}
            >
              <LogOut className="size-5 shrink-0" />
              {!c && <span>Keluar</span>}
            </button>
          </SidebarTooltip>
        </nav>
      );
    }

    // Default global dashboard nav
    return (
      <nav className={cn(
        "flex flex-1 flex-col gap-1 py-4 font-sans text-left",
        c
          ? "px-1 items-center overflow-y-hidden sidebar-scroll-hidden"
          : "px-3 overflow-y-auto sidebar-scroll"
      )}>
        <NavItem
          href="/dashboard"
          icon={LayoutDashboard}
          label="Dashboard"
          active={pathname === "/dashboard"}
        />

        <NavItem
          href="/dashboard/schedule"
          icon={CalendarRange}
          label="Jadwal"
          active={pathname === "/dashboard/schedule"}
        />

        <NavItem
          href="/leaderboard"
          icon={Trophy}
          label="Peringkat"
          active={pathname === "/leaderboard" || pathname.startsWith("/leaderboard")}
        />

        {/* Courses accordion */}
        <div className={cn(c && "w-full flex flex-col items-center")}>
          <SidebarTooltip label="Courses" collapsed={c}>
            <button
              type="button"
              onClick={handleCoursesToggle}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm font-medium transition-colors cursor-pointer",
                pathname.startsWith("/courses")
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                c && "justify-center size-10 px-0 mx-auto"
              )}
            >
              <BookOpen className="size-5 shrink-0" />
              {!c && (
                <>
                  <span className="flex-1 text-left">Courses</span>
                  {coursesOpen
                    ? <ChevronDown className="size-4" />
                    : <ChevronRight className="size-4" />}
                </>
              )}
            </button>
          </SidebarTooltip>

          {coursesOpen && !c && (
            <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
              {enrolledCourses.map((course) => {
                const active =
                  pathname === `/courses/${course.id}` ||
                  pathname.startsWith(`/courses/${course.id}/`);
                return (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    className={cn(
                      "block truncate rounded-lg px-3 py-1.5 text-body-xs font-medium transition-colors",
                      active
                        ? "bg-brand-primary/8 text-brand-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {course.title}
                  </Link>
                );
              })}
              <Link
                href="/courses"
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-body-xs font-semibold text-brand-secondary hover:underline",
                  pathname === "/courses" && "underline"
                )}
              >
                <Search className="size-3 shrink-0" />
                Jelajahi Course
              </Link>
            </div>
          )}
        </div>

        <NavItem
          href="/profile"
          icon={User}
          label="Profile"
          active={pathname === "/profile"}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Streak calendar strip */}
        {!c && streakCurrent !== null && (
          <div className="px-3 pb-1">
            <StreakCalendarStrip current={streakCurrent} weeklyActivity={weeklyActivity} />
          </div>
        )}

        {/* Sign out */}
        <SidebarTooltip label="Keluar" collapsed={c}>
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm font-medium text-status-error transition-colors hover:bg-status-error/10 cursor-pointer",
              c && "justify-center size-10 px-0 mx-auto"
            )}
          >
            <LogOut className="size-5 shrink-0" />
            {!c && <span>Keluar</span>}
          </button>
        </SidebarTooltip>
      </nav>
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
          <Link href="/dashboard" aria-label="Dashboard Zyx Academy" className="flex items-center">
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
            {collapsed
              ? <PanelLeftOpen className="size-4" />
              : <PanelLeftClose className="size-4" />}
          </button>
        </SidebarTooltip>
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

      <Nav collapsed={collapsed} />
    </aside>
  );
}
