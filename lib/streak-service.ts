import { db } from "@/db";
import { studentStreaks, learningEvents } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function hasActivityOn(studentId: string, dateStr: string): Promise<boolean> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(learningEvents)
    .where(
      sql`${learningEvents.studentId} = ${studentId} AND strftime('%Y-%m-%d', datetime(${learningEvents.createdAt}, 'unixepoch')) = ${dateStr}`
    );
  return (row?.count ?? 0) > 0;
}

export async function getOrUpdateStreak(
  studentId: string
): Promise<{ current: number; longest: number }> {
  const today = todayUtc();

  const [row] = await db
    .select()
    .from(studentStreaks)
    .where(eq(studentStreaks.studentId, studentId))
    .limit(1);

  if (!row) {
    const active = await hasActivityOn(studentId, today);
    const current = active ? 1 : 0;
    await db.insert(studentStreaks).values({
      studentId,
      currentStreak: current,
      longestStreak: current,
      lastActiveDate: today,
    });
    return { current, longest: current };
  }

  // Same day — no-op
  if (row.lastActiveDate === today) {
    return { current: row.currentStreak, longest: row.longestStreak };
  }

  const active = await hasActivityOn(studentId, today);
  if (!active) {
    // No activity yet today — just report current state
    return { current: row.currentStreak, longest: row.longestStreak };
  }

  const yesterday = yesterdayUtc();
  let newCurrent: number;
  if (row.lastActiveDate === yesterday) {
    newCurrent = row.currentStreak + 1;
  } else {
    // Gap — reset
    newCurrent = 1;
  }
  const newLongest = Math.max(row.longestStreak, newCurrent);

  await db
    .update(studentStreaks)
    .set({ currentStreak: newCurrent, longestStreak: newLongest, lastActiveDate: today })
    .where(eq(studentStreaks.studentId, studentId));

  return { current: newCurrent, longest: newLongest };
}

/**
 * Returns a 7-element boolean array mapping Monday to Sunday activity of the current week.
 */
export async function getWeeklyActivity(studentId: string): Promise<boolean[]> {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0: Sunday, 1: Mon, ..., 6: Sat
  
  // Align Monday as first index (0) and Sunday as last index (6)
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    dates.push(`${yyyy}-${mm}-${dd}`);
  }

  const results = await Promise.all(
    dates.map((dateStr) => hasActivityOn(studentId, dateStr))
  );

  return results;
}

