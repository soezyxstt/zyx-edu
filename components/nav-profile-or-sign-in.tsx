"use client";

import Link from "next/link";
import { LogOut, User } from "lucide-react";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";
import { signOut, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type NavProfileOrSignInProps = {
  variant?: "toolbar" | "sheet";
  callbackURL?: string;
  onNavigate?: () => void;
  /** Set false for contexts (e.g. admin bar) where Sign In must not appear. */
  showSignIn?: boolean;
};

export function NavProfileOrSignIn({
  variant = "toolbar",
  callbackURL = "/dashboard",
  onNavigate,
  showSignIn = true,
}: NavProfileOrSignInProps) {
  const { data: session, isPending } = useSession();
  const sheet = variant === "sheet";

  if (isPending) {
    if (!showSignIn) return null;
    return (
      <div
        className={cn(
          sheet ? "bg-muted/60 h-18 w-full shrink-0 animate-pulse rounded-xl" : "",
          !sheet &&
            cn(
              "bg-muted/60 shrink-0 animate-pulse rounded-full",
              "size-10 lg:h-10 lg:w-28",
            ),
        )}
        aria-hidden
      />
    );
  }

  if (session?.user) {
    const name = session.user.name?.trim();
    const email = session.user.email;
    const label = name || email?.split("@")[0] || "Akun";

    if (sheet) {
      return (
        <div className="flex w-full flex-col gap-2">
          <SheetClose asChild>
            <Link
              href="/dashboard"
              title={email ?? label}
              aria-label={`Dashboard (${label})`}
              onClick={onNavigate}
              className={cn(
                "border-border hover:bg-muted/70 flex min-h-14 w-full items-center gap-3 rounded-xl border bg-background px-3 py-2.5 shadow-none transition-colors",
                "outline-none focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
              )}
            >
              {session.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt=""
                  width={40}
                  height={40}
                  className="border-border size-10 shrink-0 rounded-full border object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="bg-muted border-border flex size-10 shrink-0 items-center justify-center rounded-full border">
                  <User className="text-muted-foreground size-5" aria-hidden />
                </span>
              )}
              <div className="min-w-0 flex-1 text-left">
                <p className="font-heading text-base font-semibold leading-tight tracking-tight text-foreground">
                  {label}
                </p>
                {email ? (
                  <p className="text-body-sm mt-0.5 truncate text-muted-foreground">{email}</p>
                ) : null}
              </div>
            </Link>
          </SheetClose>
          <Button
            type="button"
            variant="outline"
            className="text-body-sm h-11 w-full justify-center gap-2 rounded-xl font-medium"
            onClick={() => {
              void (async () => {
                await signOut();
                onNavigate?.();
              })();
            }}
          >
            <LogOut className="size-4" aria-hidden />
            Keluar
          </Button>
        </div>
      );
    }

    return (
      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        <Button
          variant="ghost"
          asChild
          className={cn(
            "text-foreground gap-2 rounded-full hover:bg-muted",
            "h-10 max-w-[11rem] shrink-0 lg:justify-start lg:gap-2 lg:px-2",
            "max-lg:size-10 max-lg:justify-center max-lg:border max-lg:border-border/60 max-lg:p-0 max-lg:shadow-none max-lg:hover:border-border max-lg:hover:bg-muted/80",
          )}
        >
          <Link
            href="/dashboard"
            title={email ?? label}
            aria-label={`Dashboard (${label})`}
            onClick={onNavigate}
            className="flex size-full items-center justify-center lg:size-auto lg:min-h-10 lg:flex-1 lg:gap-2 lg:px-px"
          >
            {session.user.image ? (
              // Google avatars — plain img avoids expanding next/image remotePatterns here.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt=""
                width={32}
                height={32}
                className="border-border max-lg:size-9 max-lg:border-0 shrink-0 rounded-full border object-cover lg:size-8"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="bg-muted border-border flex max-lg:size-9 shrink-0 items-center justify-center rounded-full border lg:size-8">
                <User className="text-muted-foreground size-4" aria-hidden />
              </span>
            )}
            <span className="hidden text-body-sm font-medium lg:inline">
              <span className="truncate">{label}</span>
            </span>
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "interactive h-10 min-h-10 min-w-10 shrink-0 rounded-full text-body-sm font-medium text-foreground/90 hover:bg-muted hover:text-foreground",
            "gap-1.5 px-0 max-lg:justify-center max-lg:p-0",
            "lg:min-w-0 lg:gap-2 lg:px-2",
          )}
          onClick={() => {
            void (async () => {
              await signOut();
              onNavigate?.();
            })();
          }}
          aria-label="Keluar dari akun"
          title="Keluar"
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          <span className="max-lg:sr-only">Keluar</span>
        </Button>
      </div>
    );
  }

  if (!showSignIn) return null;

  return (
    <GoogleSignInButton
      label="Masuk dengan Google"
      callbackURL={callbackURL}
      onBeforeOAuth={onNavigate}
      containerClassName={cn(sheet ? "w-full" : "flex shrink-0 flex-row gap-2")}
      className={cn(
        sheet
          ? "h-11 w-full rounded-xl bg-primary text-body-sm font-semibold text-primary-foreground hover:bg-primary/90"
          : "h-10 shrink-0 rounded-full bg-primary px-5 text-body-sm font-semibold text-primary-foreground hover:bg-primary/90",
      )}
    />
  );
}
