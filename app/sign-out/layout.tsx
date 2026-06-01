import type { Metadata } from "next";
import { pageTitle } from "@/lib/site";

export const metadata: Metadata = {
  title: pageTitle("Sign out"),
  description: "Keluar dari akun Zyx Academy.",
};

export default function SignOutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
