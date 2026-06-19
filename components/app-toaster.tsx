"use client";

import { Toaster } from "@/components/ui/toast";

/** Lightweight toaster without next-themes coupling ; matches app until ThemeProvider wraps the tree. */
export function AppToaster() {
  return <Toaster />;
}
