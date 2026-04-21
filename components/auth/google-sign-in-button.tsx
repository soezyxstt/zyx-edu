"use client";

import { useCallback, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type GoogleSignInButtonProps = {
  label?: string;
  callbackURL?: string;
  /** Applied to the primary control (e.g. height, colors). */
  className?: string;
  /** Applied to the outer column (use for responsive visibility / width). */
  containerClassName?: string;
  /** Runs immediately before the OAuth redirect (e.g. close a mobile menu). */
  onBeforeOAuth?: () => void;
};

function mapSignInError(err: unknown): string {
  if (err instanceof TypeError) {
    return "Network error. Check your connection and try again.";
  }
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    if (m.includes("fetch") || m.includes("network") || m.includes("failed to fetch")) {
      return "Network error. Check your connection and try again.";
    }
  }
  return "Something went wrong starting Google sign-in. Please try again.";
}

export function GoogleSignInButton({
  label = "Continue with Google",
  callbackURL = "/dashboard",
  className,
  containerClassName,
  onBeforeOAuth,
}: GoogleSignInButtonProps) {
  const errorId = useId();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    onBeforeOAuth?.();
    setErrorMessage(null);
    setLoading(true);
    try {
      // better-auth redirects the browser on success; failures surface here.
      await signIn.social({
        provider: "google",
        callbackURL,
      });
    } catch (err) {
      setErrorMessage(mapSignInError(err));
    } finally {
      setLoading(false);
    }
  }, [callbackURL, onBeforeOAuth]);

  return (
    <div className={cn("flex w-full flex-col gap-2", containerClassName)}>
      <Button
        type="button"
        className={cn("gap-2", className)}
        onClick={() => void handleClick()}
        disabled={loading}
        aria-busy={loading}
        aria-describedby={errorMessage ? errorId : undefined}
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            <span>Connecting…</span>
          </>
        ) : (
          label
        )}
      </Button>
      {errorMessage ? (
        <p
          id={errorId}
          role="alert"
          className="text-body-sm text-status-error"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
