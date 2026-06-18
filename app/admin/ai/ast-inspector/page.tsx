import type { Metadata } from "next";
import { assertAdmin } from "@/lib/uploadthing-admin";
import { ASTInspectorClient } from "./ast-inspector-client";

export const metadata: Metadata = {
  title: "Zyx AST Inspector & Debugger",
  description: "Debug and inspect canonical markdown compilation pipelines.",
};

export default async function ASTInspectorPage() {
  await assertAdmin();
  return <ASTInspectorClient />;
}
