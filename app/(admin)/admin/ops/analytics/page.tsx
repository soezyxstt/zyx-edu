import type { Metadata } from "next";
import { pageTitle } from "@/lib/site";
import { assertTutorOrAdmin } from "@/lib/uploadthing-admin";
import { AiAnalyticsClient } from "./analytics-client";

export const metadata: Metadata = {
  title: pageTitle("Analytics"),
};

export default async function AiAnalyticsPage() {
  await assertTutorOrAdmin();

  return (
    <div className="space-y-6">
      <AiAnalyticsClient />
    </div>
  );
}
