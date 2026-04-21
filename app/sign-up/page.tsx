import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/sign-up-form";
import {
  getOAuthCallbackErrorMessage,
  getSafeRedirectPath,
} from "@/lib/auth-redirect";
import { pageTitle } from "@/lib/site";

export const metadata: Metadata = {
  title: pageTitle("Sign up"),
  description: "Daftar ke Zyx Edu dengan Google.",
};

type SearchParams = {
  next?: string | string[];
  error?: string | string[];
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const callbackURL = getSafeRedirectPath(sp.next);
  const urlErrorMessage = getOAuthCallbackErrorMessage(sp.error);

  return (
    <SignUpForm callbackURL={callbackURL} urlErrorMessage={urlErrorMessage} />
  );
}
