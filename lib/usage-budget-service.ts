import { db } from "@/db";
import { aiUsageEvents } from "@/db/schema";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import * as crypto from "crypto";

export class UsageBudgetService {
  /**
   * Aggregates the number of usage events for a user on the current calendar date.
   */
  static async getDailyUsageCount(userId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiUsageEvents)
      .where(
        and(
          eq(aiUsageEvents.userId, userId),
          gte(aiUsageEvents.createdAt, startOfDay)
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
