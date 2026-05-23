"use client";

/* eslint-disable react-hooks/static-components */

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  PanelLeftOpen,
  Settings,
  User,
  X,
  Search,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { getStudentEnrollments } from "@/app/dashboard/actions";
import { getCourseById } from "@/lib/student-course-fixtures";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

/* ─────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────── */
interface NavOptions {
  collapsed?: boolean;
  onLink?: () => void;
}

type StudentEnrollment = Awaited<ReturnType<typeof getStudentEnrollments>>[number];

/* ─────────────────────────────────────────────────────────────────
   StudentSidebar — self-contained component
   Desktop : sticky left panel (position: sticky, height: 100svh)
   Mobile  : hamburger topbar + <dialog> slide-over (browser top-layer)
───────────────────────────────────────────────────────────────── */
export function StudentSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const courseIdFromPath = pathname.startsWith("/courses/")
    ? pathname.split("/")[2]
    : undefined;
  const activeCourse = courseIdFromPath ? getCourseById(courseIdFromPath) : undefined;

  const [collapsed, setCollapsed] = useState(false);
  const [coursesOpen, setCoursesOpen] = useState(true);
  const [enrolledCourses, setEnrolledCourses] = useState<StudentEnrollment[]>([]);

  /* dialog ref for mobile drawer */
  const dialogRef = useRef<HTMLDialogElement>(null);

  /* ── Data ─────────────────────────────────────────── */
  useEffect(() => {
    if (session?.user?.id) {
      getStudentEnrollments().then(setEnrolledCourses).catch(console.error);
    }
  }, [session?.user?.id]);

  /* ── Mobile drawer helpers ────────────────────────── */
  const openDrawer = useCallback(() => {
    dialogRef.current?.showModal();
  }, []);

  const closeDrawer = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  /* Close drawer on route change */
  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  /* Close on Escape is built-in for <dialog> */

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

  /* ── Shared nav markup ────────────────────────────── */
  const Nav = ({ collapsed: c = false, onLink = () => {} }: NavOptions) => (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4 scrollbar-none">
      {/* Dashboard */}
      <Link
        href="/dashboard"
        onClick={onLink}
        title="Dashboard"
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm font-medium transition-colors",
          pathname === "/dashboard"
            ? "bg-brand-primary/10 text-brand-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          c && "justify-center px-2"
        )}
      >
        <LayoutDashboard className="size-5 shrink-0" />
        {!c && "Dashboard"}
      </Link>

      {/* Courses */}
      <div>
        <button
          type="button"
          onClick={handleCoursesToggle}
          title="Courses"
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm font-medium transition-colors cursor-pointer",
            pathname.startsWith("/courses")
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            c && "justify-center px-2"
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
                  onClick={onLink}
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
              onClick={onLink}
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

        {c && (
          <Link
            href="/courses"
            onClick={onLink}
            title="Jelajahi Courses"
            className={cn(
              "flex items-center justify-center rounded-xl py-2 transition-colors",
              pathname === "/courses"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Search className="size-4 shrink-0" />
          </Link>
        )}
      </div>

      {/* Profile */}
      <Link
        href="/profile"
        onClick={onLink}
        title="Profile"
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm font-medium transition-colors",
          pathname === "/profile"
            ? "bg-brand-primary/10 text-brand-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          c && "justify-center px-2"
        )}
      >
        <User className="size-5 shrink-0" />
        {!c && "Profile"}
      </Link>

      {/* Settings */}
      <Link
        href="/settings"
        onClick={onLink}
        title="Settings"
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm font-medium transition-colors",
          pathname === "/settings"
            ? "bg-brand-primary/10 text-brand-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          c && "justify-center px-2"
        )}
      >
        <Settings className="size-5 shrink-0" />
        {!c && "Settings"}
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Sign out */}
      <button
        type="button"
        onClick={handleLogout}
        title="Keluar"
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm font-medium text-status-error transition-colors hover:bg-status-error/10 cursor-pointer",
          c && "justify-center px-2"
        )}
      >
        <LogOut className="size-5 shrink-0" />
        {!c && "Keluar"}
      </button>
    </nav>
  );

  /* ── User card ────────────────────────────────────── */
  const UserCard = ({ c = false }: { c?: boolean }) =>
    session?.user ? (
      <div
        className={cn(
          "mx-3 mt-3 flex shrink-0 items-center gap-3 rounded-2xl border border-border/70 bg-muted/40 p-2.5",
          c && "justify-center"
        )}
      >
        {session.user.image ? (
          <img
            src={session.user.image}
            alt={session.user.name}
            className="size-8 shrink-0 rounded-full object-cover ring-2 ring-brand-primary/20"
          />
        ) : (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-white">
            {session.user.name?.charAt(0)?.toUpperCase() ?? "?"}
          </span>
        )}
        {!c && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-xs font-semibold text-foreground">
              {session.user.name}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {session.user.email}
            </p>
          </div>
        )}
      </div>
    ) : null;

  return (
    <>
      {/* ═══════════════════════════════════════════════
          MOBILE TOP BAR  (visible only below md)
          — stacks above main in the flex-col layout
      ═══════════════════════════════════════════════ */}
      <div className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 md:hidden">
        <Link href="/dashboard" aria-label="Dashboard ZYX Edu" className="flex items-center">
          <Logo className="[--logo-height:2rem]" />
        </Link>
        {activeCourse ? (
          <>
            <span className="h-7 w-px shrink-0 bg-border" aria-hidden />
            <nav
              aria-label="Breadcrumb"
              className="flex min-w-0 flex-1 items-center gap-1.5 text-body-sm"
            >
              <Link
                href="/courses"
                className="shrink-0 font-semibold text-brand-primary underline-offset-4 hover:underline"
              >
                Courses
              </Link>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 truncate font-medium text-foreground">
                {activeCourse.title}
              </span>
            </nav>
          </>
        ) : null}
        <button
          type="button"
          onClick={openDrawer}
          aria-label="Buka navigasi"
          title="Buka sidebar"
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <PanelLeftOpen className="size-5" />
        </button>
      </div>

      {/* ═══════════════════════════════════════════════
          DESKTOP SIDEBAR  (visible only at md+)
          — sticky in the flex-row layout
      ═══════════════════════════════════════════════ */}
      <aside
        style={{ position: "sticky", top: 0, height: "100svh" }}
        className={cn(
          "hidden md:flex flex-col shrink-0 overflow-hidden z-30",
          "border-r border-border bg-card",
          "transition-[width] duration-300 ease-in-out",
          collapsed ? "w-[64px]" : "w-[248px]"
        )}
      >
        {/* Header row: brand + collapse toggle */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3">
          {!collapsed && (
            <Link href="/dashboard" aria-label="Dashboard ZYX Edu" className="flex items-center">
              <Logo className="[--logo-height:1.75rem]" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground transition-colors",
              collapsed && "mx-auto"
            )}
          >
            {collapsed
              ? <ChevronRight className="size-4" />
              : <ChevronLeft className="size-4" />}
          </button>
        </div>

        <UserCard c={collapsed} />
        <Nav collapsed={collapsed} />
      </aside>

      {/* ═══════════════════════════════════════════════
          MOBILE DRAWER  — rendered as <dialog>
          Browser paints this in the top-layer, so it
          is always above everything else with no
          z-index fighting. Escape key closes it natively.
      ═══════════════════════════════════════════════ */}
      <dialog
        ref={dialogRef}
        onClick={(e) => {
          /* Close when clicking the backdrop (outside the inner panel) */
          if (e.target === dialogRef.current) closeDrawer();
        }}
        className={cn(
          "sidebar-dialog",
          /* Reset dialog defaults */
          "m-0 h-full max-h-full max-w-full bg-transparent p-0",
          /* Position to the left, take full height */
          "inset-y-0 left-0",
          /* Backdrop */
          "backdrop:bg-black/50 backdrop:backdrop-blur-sm"
        )}
      >
        {/* Inner panel */}
        <div className="sidebar-panel flex h-full w-72 flex-col bg-card">
          {/* Drawer header */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
            <Logo className="[--logo-height:1.75rem]" />
            <button
              type="button"
              onClick={closeDrawer}
              aria-label="Tutup navigasi"
              className="flex size-9 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          <UserCard />
          <Nav onLink={closeDrawer} />
        </div>
      </dialog>
    </>
  );
}
