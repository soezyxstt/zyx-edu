"use client";

import Link from "next/link";
import { AuthMarketingCard } from "@/components/auth/auth-marketing-card";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

type SignInFormProps = {
  callbackURL: string;
  urlErrorMessage: string | null;
};

export function SignInForm({ callbackURL, urlErrorMessage }: SignInFormProps) {
  return (
    <AuthMarketingCard
      title="Sign in"
      description={
        <>
          Use your Google account to continue. Any Gmail address can register.
        </>
      }
      urlErrorMessage={urlErrorMessage}
      footer={
        <p className="mt-6 text-center text-body-sm text-muted-foreground">
          Belum punya akun?{" "}
          <Link
            href="/sign-up"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </p>
      }
    >
      <div className="mt-8 flex flex-col gap-3">
        <GoogleSignInButton
          label="Sign in with Google"
          callbackURL={callbackURL}
          className="h-11 w-full gap-2 rounded-full bg-primary text-primary-foreground hover:bg-primary-hover"
        />
      </div>
    </AuthMarketingCard>
  );
}
