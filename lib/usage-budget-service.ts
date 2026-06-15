import { db } from "@/db";
import { aiUsageEvents } from "@/db/schema";
import { and, eq, gte, lt, ne, sql } from "drizzle-orm";
import * as crypto from "crypto";

/** Single source of truth for per-feature AI budgets (used by ops page + enforcement). */
export const BUDGETS = {
  tutorPerDay: 30,
  feedbackPerSubmission: 1,
  summariesPerDayPerUser: 5,
} as const;

export class UsageBudgetService {
  /**
   * Aggregates the number of usage events for a user on the current calendar date.
   */
  static async getDailyUsageCount(userId: string): Promise<number> {
    const todayUtc = new Date().toISOString().slice(0, 10);
    const startOfDay = new Date(`${todayUtc}T00:00:00.000Z`);
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiUsageEvents)
      .where(
        and(
          eq(aiUsageEvents.userId, userId),
          gte(aiUsageEvents.createdAt, startOfDay),
          // Cache hits are logged for observability but never charge the budget
          ne(aiUsageEvents.requestType, "cache:hit")
        )
      );
    return result[0]?.count ?? 0;
  }

  /**
   * Validates if a user is within their daily usage cap (default: 30 requests).
   */
  static async canUseFeature(userId: string, limit = 30): Promise<boolean> {
    const count = await this.getDailyUsageCount(userId);
    return count < limit;
  }

  /**
   * Log an AI generation event inside the event-based usage ledger.
   */
  static async recordUsage(params: {
    userId: string;
    feature: string;
    model: string;
    tokens: number;
    requestType: string;
  }): Promise<void> {
    const id = crypto.randomUUID();
    await db.insert(aiUsageEvents).values({
      id,
      userId: params.userId,
      feature: params.feature,
      model: params.model,
      tokens: params.tokens,
      requestType: params.requestType,
    });
  }

  /**
   * Deletes all usage events older than 30 days to limit database storage growth.
   */
  static async pruneOldEvents(): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    await db
      .delete(aiUsageEvents)
      .where(lt(aiUsageEvents.createdAt, cutoff));
  }
}
