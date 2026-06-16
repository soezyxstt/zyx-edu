import type { Metadata } from "next";
import { pageTitle } from "@/lib/site";
import { KeysClient } from "./keys-client";

export const metadata: Metadata = {
  title: pageTitle("Key Diagnostics"),
  description: "Status dan kuota harian tiap API key.",
};

export default function KeysPage() {
  return <KeysClient />;
}
