import type { Metadata } from "next";
import { pageTitle } from "@/lib/site";
import { Reveal } from "@/components/ui/reveal";
import { assertTutorOrAdmin } from "@/lib/uploadthing-admin";
import { AiAnalyticsClient } from "./analytics-client";

export const metadata: Metadata = {
  title: pageTitle("AI Analytics"),
};

export default async function AiAnalyticsPage() {
  await assertTutorOrAdmin();

  return (
    <Reveal className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="font-heading text-h4 font-semibold text-foreground">
          AI Analytics
        </h1>
        <p className="mt-2 text-body-sm text-muted-foreground">
          Monitor Gemini API usage, Cloudflare AI Gateway routing, latency,
          and error rates in real time.
        </p>
      </div>
      <AiAnalyticsClient />
    </Reveal>
  );
}
