"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  KeyRound,
  BookText,
  Zap,
  ListChecks,
  ClipboardList,
  GraduationCap,
  LogOut,
  Search,
  PanelLeftOpen,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { useCommandMenu } from "@/components/command-menu";

interface NavOptions {
  collapsed?: boolean;
  onLink?: () => void;
}

export function AdminSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { setOpen: setSearchOpen } = useCommandMenu();

  const [collapsed, setCollapsed] = useState(false);
  const [modKeyHint, setModKeyHint] = useState("Ctrl + K");

  useEffect(() => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    setModKeyHint(/Mac|iPhone|iPod|iPad/i.test(ua) ? "⌘K" : "Ctrl + K");
  }, []);

  const dialogRef = useRef<HTMLDialogElement>(null);

  const openDrawer = useCallback(() => {
    dialogRef.current?.showModal();
  }, []);

  const closeDrawer = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/";
  };

  const Nav = ({ collapsed: c = false, onLink = () => {} }: NavOptions) => {
    const linkClass = (href: string) => {
      const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
      return cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm font-medium transition-colors",
        active
          ? "bg-brand-primary/10 text-brand-primary font-semibold"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        c && "justify-center px-2"
      );
    };

    return (
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4 scrollbar-none">
        {/* Panel Admin */}
        <Link href="/admin" onClick={onLink} title="Panel Admin" className={linkClass("/admin")}>
          <LayoutDashboard className="size-5 shrink-0" />
          {!c && "Panel Admin"}
        </Link>

        {/* File Storage */}
        <Link href="/admin/files" onClick={onLink} title="File Storage" className={linkClass("/admin/files")}>
          <FolderOpen className="size-5 shrink-0" />
          {!c && "File Storage"}
        </Link>

        {/* Token Aktivasi Kelas */}
        <Link href="/admin/tokens" onClick={onLink} title="Token Aktivasi Kelas" className={linkClass("/admin/tokens")}>
          <KeyRound className="size-5 shrink-0" />
          {!c && "Token Aktivasi"}
        </Link>

        {/* Materi AI */}
        <Link href="/admin/ai/materials" onClick={onLink} title="Materi AI" className={linkClass("/admin/ai/materials")}>
          <BookText className="size-5 shrink-0" />
          {!c && "Materi AI"}
        </Link>

        {/* Generasi Soal */}
        <Link href="/admin/ai/jobs" onClick={onLink} title="Generasi Soal" className={linkClass("/admin/ai/jobs")}>
          <Zap className="size-5 shrink-0" />
          {!c && "Generasi Soal"}
        </Link>

        {/* Bank Soal */}
        <Link href="/admin/ai/questions" onClick={onLink} title="Bank Soal" className={linkClass("/admin/ai/questions")}>
          <ListChecks className="size-5 shrink-0" />
          {!c && "Bank Soal"}
        </Link>

        {/* Template Kuis */}
        <Link href="/admin/ai/quizzes" onClick={onLink} title="Template Kuis" className={linkClass("/admin/ai/quizzes")}>
          <ClipboardList className="size-5 shrink-0" />
          {!c && "Template Kuis"}
        </Link>

        {/* Spacer */}
        <div className="flex-1 min-h-[20px]" />

        {/* Beranda Siswa / Utama */}
        <Link
          href="/dashboard"
          onClick={onLink}
          title="Beranda Siswa"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm font-semibold text-brand-secondary transition-colors hover:bg-brand-secondary/10",
            c && "justify-center px-2"
          )}
        >
          <GraduationCap className="size-5 shrink-0" />
          {!c && "Beranda Siswa"}
        </Link>

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
  };

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
      {/* MOBILE TOP BAR (visible only below md) */}
      <div className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 md:hidden">
        <button
          type="button"
          onClick={openDrawer}
          aria-label="Buka navigasi"
          title="Buka sidebar"
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <PanelLeftOpen className="size-5" />
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-muted-foreground transition-all hover:bg-muted/70 hover:text-foreground cursor-pointer"
          >
            <Search className="size-4 shrink-0" />
            <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border text-[10px] font-mono leading-none font-semibold">
              {modKeyHint}
            </kbd>
          </button>

          <Link href="/admin" aria-label="Panel Admin Zyx Academy" className="flex items-center">
            <Logo className="[--logo-height:1.75rem]" />
          </Link>
        </div>
      </div>

      {/* DESKTOP SIDEBAR (visible only at md+) */}
      <aside
        style={{ position: "sticky", top: 0, height: "100svh" }}
        className={cn(
          "hidden md:flex flex-col shrink-0 overflow-hidden z-30",
          "border-r border-border bg-card",
          "transition-[width] duration-300 ease-in-out",
          collapsed ? "w-[64px]" : "w-[248px]"
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3">
          {!collapsed && (
            <Link href="/admin" aria-label="Panel Admin Zyx Academy" className="flex items-center">
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
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        </div>

        <UserCard c={collapsed} />

        <div className="px-3 pt-3 shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            title="Search"
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-muted-foreground transition-all hover:bg-muted/70 hover:text-foreground cursor-pointer mx-auto",
              collapsed ? "size-10" : "w-full"
            )}
          >
            <Search className="size-4 shrink-0" />
            {!collapsed && (
              <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border text-[10px] font-mono leading-none font-semibold">
                {modKeyHint}
              </kbd>
            )}
          </button>
        </div>

        <Nav collapsed={collapsed} />
      </aside>

      {/* MOBILE DRAWER */}
      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) closeDrawer();
        }}
        className={cn(
          "sidebar-dialog",
          "m-0 h-full max-h-full max-w-full bg-transparent p-0",
          "inset-y-0 left-0",
          "backdrop:bg-black/50 backdrop:backdrop-blur-sm"
        )}
      >
        <div className="sidebar-panel flex h-full w-72 flex-col bg-card">
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
