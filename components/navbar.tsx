"use client";

import { useState } from "react";
import { useEffect } from "react";
import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Logo } from "@/components/logo";
import { NavProfileOrSignIn } from "@/components/nav-profile-or-sign-in";
import { useCommandMenu } from "@/components/command-menu";
import { cn } from "@/lib/utils";

const navLinks = [
  { name: "Paket", href: "/plans" },
  { name: "Tentang kami", href: "/about" },
  { name: "Testimoni", href: "/testimonial" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { setOpen: setSearchOpen } = useCommandMenu();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full">
      <nav
        className={cn(
          "w-full transition-all duration-200",
          isScrolled ? "backdrop-blur-md bg-background/80 border-b border-border/40" : "bg-transparent border-b-0"
        )}
        aria-label="Primary"
      >
        {/* Below lg: search + compact profile + drawer. lg+: centered links + Lihat paket + full profile. */}
        <div className="relative mx-auto flex min-h-13 min-w-0 w-full max-w-7xl items-center gap-2 px-3 py-3 sm:px-4 md:min-h-14 md:gap-3 md:py-3.5 lg:px-5">
          <Link
            href="/"
            className="relative z-10 -m-px flex shrink-0 items-center p-px [&_img]:block [&_img]:align-middle [&_svg]:block"
          >
            <Logo className="max-h-8 max-w-[68px] md:max-h-9 md:max-w-[76px]" />
          </Link>

          {/* Never use unconditional `hidden` + `md:flex` — if `hidden` wins in CSS order, desktop links disappear. Prefer max-lg:hidden. */}
          <nav
            className="max-lg:hidden lg:pointer-events-none lg:absolute lg:inset-x-0 lg:top-0 lg:bottom-0 lg:flex lg:items-center lg:justify-center"
            aria-label="Main menu"
          >
            <ul className="flex items-center gap-5 text-body-sm font-medium leading-none tracking-tight lg:pointer-events-auto lg:leading-normal">
              {navLinks.map((link) => (
                <li key={link.href} className="flex shrink-0 items-center">
                  <Link
                    href={link.href}
                    className="text-foreground/90 hover:text-brand-primary inline-flex items-center justify-center px-px py-0 transition-colors lg:min-h-10"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="relative z-10 ml-auto flex min-w-0 shrink-0 items-center justify-end gap-1.5 md:gap-2.5">
            <Button
              variant="ghost"
              className="size-10 shrink-0 rounded-full"
              type="button"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="size-[1.125rem]" aria-hidden />
              <span className="sr-only">Cari (pintasan papan ketik: Ctrl+K atau ⌘K)</span>
            </Button>

            <div className="hidden shrink-0 items-center gap-2 lg:flex lg:gap-2.5">
              <Link
                href="/sign-in"
                className="interactive text-body-sm font-medium text-foreground underline decoration-[var(--zx-accent)] decoration-2 underline-offset-4 hover:text-foreground lg:mr-1"
              >
                Masuk
              </Link>
              <Button
                asChild
                className={cn(
                  "inline-flex h-10 shrink-0 items-center px-5 text-body-sm font-medium leading-none rounded-md bg-[#1a2744] text-white hover:bg-[#1a2744]/90",
                )}
              >
                <Link href="/plans">Lihat paket</Link>
              </Button>
            </div>

            <NavProfileOrSignIn variant="toolbar" callbackURL="/dashboard" />

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  className="inline-flex size-10 shrink-0 rounded-full lg:hidden"
                  aria-expanded={mobileOpen}
                  aria-controls="mobile-navigation"
                  type="button"
                >
                  {mobileOpen ? (
                    <X className="size-6" strokeWidth={2} />
                  ) : (
                    <Menu className="size-6" strokeWidth={2} />
                  )}
                  <span className="sr-only">{mobileOpen ? "Tutup menu" : "Buka menu"}</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                id="mobile-navigation"
                side="right"
                showCloseButton={false}
                className={cn(
                  "gap-0 p-0",
                  "flex h-full max-h-dvh w-[min(17.5rem,calc(100vw-1.5rem))] flex-col border-l border-border/80 bg-background shadow-xl",
                  "pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]",
                )}
              >
                <SheetHeader className="border-border space-y-1 border-b px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top,0px))] text-left">
                  <SheetTitle className="font-heading text-xl font-semibold tracking-tight text-foreground">
                    Menu
                  </SheetTitle>
                  <SheetDescription className="text-body-sm text-muted-foreground">
                    Plans, tentang kami, testimoni, paket, dan akun.
                  </SheetDescription>
                </SheetHeader>
                <div className="flex min-h-0 flex-1 flex-col">
                  <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label="Mobile menu">
                    <ul className="flex flex-col gap-1">
                      <li>
                        <button
                          type="button"
                          onClick={() => {
                            setMobileOpen(false);
                            setSearchOpen(true);
                          }}
                          className={cn(
                            "font-heading text-lg font-medium text-foreground",
                            "flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-colors",
                            "hover:bg-muted/80 active:bg-muted",
                            "focus-visible:ring-ring outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                          )}
                        >
                          <Search className="size-5 shrink-0 opacity-70" aria-hidden />
                          Cari di situs…
                        </button>
                      </li>
                      {navLinks.map((link) => (
                        <li key={link.href}>
                          <SheetClose asChild>
                            <Link
                              href={link.href}
                              className={cn(
                                "font-heading text-lg font-medium text-foreground",
                                "block rounded-xl px-4 py-3.5 transition-colors",
                                "hover:bg-muted/80 active:bg-muted",
                                "focus-visible:ring-ring outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                              )}
                            >
                              {link.name}
                            </Link>
                          </SheetClose>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex flex-col gap-2 px-1">
                      <SheetClose asChild>
                        <Link
                          href="/sign-in"
                          className="interactive rounded-xl px-4 py-3 text-center text-body-sm font-medium text-foreground underline decoration-[var(--zx-accent)] underline-offset-4"
                        >
                          Masuk
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button
                          asChild
                          className={cn(
                            "h-11 w-full rounded-md text-body-sm font-medium shadow-none",
                            "bg-[#1a2744] text-white hover:bg-[#1a2744]/90",
                          )}
                        >
                          <Link href="/plans">Lihat paket</Link>
                        </Button>
                      </SheetClose>
                    </div>
                  </nav>
                  <div className="border-border flex w-full flex-col border-t px-5 py-4">
                    <NavProfileOrSignIn
                      variant="sheet"
                      callbackURL="/dashboard"
                      onNavigate={() => setMobileOpen(false)}
                    />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  );
}
