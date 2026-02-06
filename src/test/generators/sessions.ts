import type { Session } from "@/types/session";
import type { Side, SessionSource } from "@/types/common";

interface GenerateOptions {
  count?: number;
  startDate?: Date;
  endDate?: Date;
  amountRange?: [number, number];
  sides?: (Side | undefined)[];
  source?: SessionSource;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate realistic pumping session data.
 * Models a typical pattern: morning peak, afternoon dip, cluster in evening.
 */
export function generateSessions(options: GenerateOptions = {}): Omit<Session, "id">[] {
  const {
    count = 200,
    startDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // 4 months ago
    endDate = new Date(),
    amountRange = [40, 180],
    sides = ["left", "right", "both", undefined],
    source = "manual",
  } = options;

  const sessions: Omit<Session, "id">[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / dayMs);
  const sessionsPerDay = count / totalDays;

  // Time-of-day distribution (hours): morning peak, afternoon, evening cluster
  const timeSlots = [
    { hour: 6, weight: 0.15, amountBonus: 1.2 },  // Early morning
    { hour: 9, weight: 0.2, amountBonus: 1.3 },   // Morning peak
    { hour: 12, weight: 0.15, amountBonus: 1.0 },  // Noon
    { hour: 15, weight: 0.15, amountBonus: 0.9 },  // Afternoon dip
    { hour: 18, weight: 0.15, amountBonus: 1.0 },  // Evening
    { hour: 21, weight: 0.15, amountBonus: 0.85 }, // Night
    { hour: 0, weight: 0.05, amountBonus: 0.7 },   // Late night
  ];

  // Gradual upward trend over time (simulate supply establishing)
  const trendFactor = (dayIndex: number) => 0.85 + 0.15 * (dayIndex / totalDays);

  for (let d = 0; d < totalDays; d++) {
    // Vary sessions per day (Poisson-like)
    const todayCount = Math.max(
      1,
      Math.round(sessionsPerDay + (Math.random() - 0.5) * 2),
    );

    for (let s = 0; s < todayCount; s++) {
      const slot = randomChoice(timeSlots);
      const baseDate = new Date(startDate.getTime() + d * dayMs);
      const minuteJitter = randomBetween(-30, 30);
      const timestamp = new Date(baseDate);
      timestamp.setHours(slot.hour, 30 + minuteJitter, randomBetween(0, 59));

      if (timestamp > endDate) continue;

      const baseAmount = randomBetween(amountRange[0], amountRange[1]);
      const amount = Math.round(baseAmount * slot.amountBonus * trendFactor(d));
      const side = randomChoice(sides);

      sessions.push({
        timestamp,
        amount_ml: amount,
        amount_entered: amount,
        unit_entered: "ml",
        side,
        duration_min: randomBetween(10, 30),
        source,
        created_at: timestamp,
        updated_at: timestamp,
      });
    }
  }

  // Sort by timestamp
  sessions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Add some near-duplicates for dedup testing (every ~50th session)
  const dupes: Omit<Session, "id">[] = [];
  for (let i = 0; i < sessions.length; i += randomBetween(40, 60)) {
    if (i >= sessions.length) break;
    const orig = sessions[i];
    dupes.push({
      ...orig,
      timestamp: new Date(orig.timestamp.getTime() + randomBetween(-5, 5) * 60 * 1000),
      amount_ml: orig.amount_ml + randomBetween(-3, 3),
      amount_entered: orig.amount_ml + randomBetween(-3, 3),
      source: "ai_vision",
    });
  }

  return [...sessions, ...dupes].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );
}

/**
 * Seed the database with generated sessions.
 */
export async function seedDatabase(count = 200) {
  const { db } = await import("@/db");
  const sessions = generateSessions({ count });
  await db.sessions.bulkAdd(sessions as Session[]);
  return sessions.length;
}
