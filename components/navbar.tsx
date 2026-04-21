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
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Logo } from "@/components/logo";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { cn } from "@/lib/utils";

const navLinks = [
  { name: "Plans", href: "/plans" },
  { name: "About Us", href: "/about" },
  { name: "Testimonial", href: "/testimonial" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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
        <div
          className="mx-auto grid w-full max-w-6xl grid-cols-2 items-center gap-2 px-4 py-2.5 sm:px-6 md:grid-cols-[1fr_auto_1fr] md:gap-4 md:px-6 md:py-3"
        >
          <Link
            href="/"
            className="max-w-[68px] shrink-0 justify-self-start md:max-w-[76px]"
          >
            <Logo className="max-w-[68px] md:max-w-[76px]" />
          </Link>

          <ul
            className={cn(
              "hidden items-center justify-center gap-5 text-body-sm font-medium md:flex md:justify-self-center"
            )}
          >
            {navLinks.map((link) => (
              <li key={link.name}>
                <Link
                  href={link.href}
                  className={cn(
                    "transition-colors",
                    "hover:text-brand-primary"
                  )}
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-end gap-2 justify-self-end md:gap-3">
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-full"
                  )}
                  type="button"
                >
                  <Search className="size-5" />
                  <span className="sr-only">Search</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Search</DialogTitle>
                  <DialogDescription>
                    Search is not available yet. Use the top links for Plans, About, and Testimonials, or open
                    Courses from the landing page.
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>

            <Button
              asChild
              className={cn(
                "hidden h-9 px-4 text-body-sm font-semibold md:inline-flex",
                "rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              <Link href="/plans">Lihat paket</Link>
            </Button>

            <GoogleSignInButton
              label="Sign In"
              callbackURL="/dashboard"
              containerClassName="hidden w-auto md:flex"
              className={cn(
                "h-9 px-4 text-body-sm font-semibold",
                "rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            />

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full md:hidden"
                  aria-expanded={mobileOpen}
                  aria-controls="mobile-navigation"
                  type="button"
                >
                  {mobileOpen ? (
                    <X className="size-6" strokeWidth={2} />
                  ) : (
                    <Menu className="size-6" strokeWidth={2} />
                  )}
                  <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                id="mobile-navigation"
                side="top"
                showCloseButton={false}
                className="flex h-screen w-full flex-col pt-20"
              >
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SheetDescription className="sr-only">
                  Open the main navigation links and sign in action.
                </SheetDescription>
                <div className="flex flex-col items-center gap-8 text-center font-heading text-h5">
                  {navLinks.map((link) => (
                    <SheetClose asChild key={link.name}>
                      <Link href={link.href} className="hover:text-brand-primary">
                        {link.name}
                      </Link>
                    </SheetClose>
                  ))}
                  <SheetClose asChild>
                    <Button asChild variant="outline" className="w-[200px] rounded-md">
                      <Link href="/plans">Lihat paket</Link>
                    </Button>
                  </SheetClose>
                  <GoogleSignInButton
                    label="Sign In"
                    callbackURL="/dashboard"
                    onBeforeOAuth={() => setMobileOpen(false)}
                    containerClassName="w-[200px]"
                    className="h-11 w-full rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  );
}
