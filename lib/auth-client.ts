"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Fallback to undefined when NEXT_PUBLIC_APP_URL is not defined so Better Auth
  // dynamically uses the current browser origin. This prevents CORS and mismatch
  // issues when accessing via localhost, 127.0.0.1, or local network IPs.
  baseURL: process.env.NEXT_PUBLIC_APP_URL || undefined,
});

export const { signIn, signOut, useSession } = authClient;

