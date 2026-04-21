import { z } from "zod";

/**
 * Schema for the public site origin (better-auth client `baseURL`).
 * Safe to use in `"use client"` modules — only touches `NEXT_PUBLIC_*`.
 */
export const publicAppUrlSchema = z.preprocess(
  (val) =>
    typeof val === "string" && val.length > 0 ? val : "http://localhost:3000",
  z.string().url()
);

export function getPublicAppUrl(): string {
  return publicAppUrlSchema.parse(process.env.NEXT_PUBLIC_APP_URL);
}
