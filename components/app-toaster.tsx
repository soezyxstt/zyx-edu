"use client";

import { Toaster } from "sonner";

/** Lightweight toaster without next-themes coupling — matches app until ThemeProvider wraps the tree. */
export function AppToaster() {
  return <Toaster position="top-center" richColors closeButton />;
}
