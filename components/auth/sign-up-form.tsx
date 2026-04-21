"use client";

import Link from "next/link";
import { AuthMarketingCard } from "@/components/auth/auth-marketing-card";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

type SignUpFormProps = {
  callbackURL: string;
  urlErrorMessage: string | null;
};

export function SignUpForm({ callbackURL, urlErrorMessage }: SignUpFormProps) {
  return (
    <AuthMarketingCard
      title="Sign up"
      description={
        <>
          Registration uses Google sign-in. You will be redirected to complete
          onboarding on the dashboard when ready.
        </>
      }
      urlErrorMessage={urlErrorMessage}
      footer={
        <p className="mt-6 text-center text-body-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <div className="mt-8 flex flex-col gap-3">
        <GoogleSignInButton
          label="Sign up with Google"
          callbackURL={callbackURL}
          className="h-11 w-full gap-2 rounded-full bg-primary text-primary-foreground hover:bg-primary-hover"
        />
      </div>
    </AuthMarketingCard>
  );
}
