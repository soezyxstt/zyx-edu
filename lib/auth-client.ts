"use client";

import { createAuthClient } from "better-auth/react";
import { getPublicAppUrl } from "@/lib/public-app-url";

export const authClient = createAuthClient({
  baseURL: getPublicAppUrl(),
});

export const { signIn, signOut, useSession } = authClient;
