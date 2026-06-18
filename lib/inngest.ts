import { Inngest } from "inngest";
import { env } from "@/lib/env";

/**
 * Inngest client for Zyx Academy AI Learning Content Ecosystem.
 * Used to orchestrate step-based serverless workflows.
 */
export const inngest = new Inngest({ 
  id: "zyx-academy",
  eventKey: env.INNGEST_EVENT_KEY,
});
