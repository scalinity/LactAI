import { db } from "@/db";
import type { Session } from "@/types/session";
import {
  DEDUPE_TIME_TOLERANCE_MIN,
  DEDUPE_AMOUNT_TOLERANCE_ML,
} from "./constants";
import { subMinutes, addMinutes } from "date-fns";

export function isDuplicate(
  a: { timestamp: Date; amount_ml: number },
  b: { timestamp: Date; amount_ml: number },
  toleranceMinutes = DEDUPE_TIME_TOLERANCE_MIN,
  toleranceMl = DEDUPE_AMOUNT_TOLERANCE_ML,
): boolean {
  const timeDiff = Math.abs(a.timestamp.getTime() - b.timestamp.getTime());
  const amountDiff = Math.abs(a.amount_ml - b.amount_ml);
  return timeDiff <= toleranceMinutes * 60 * 1000 && amountDiff <= toleranceMl;
}

export async function findDuplicates(
  candidate: { timestamp: Date; amount_ml: number },
  toleranceMinutes = DEDUPE_TIME_TOLERANCE_MIN,
  toleranceMl = DEDUPE_AMOUNT_TOLERANCE_ML,
): Promise<Session[]> {
  const start = subMinutes(candidate.timestamp, toleranceMinutes);
  const end = addMinutes(candidate.timestamp, toleranceMinutes);

  const nearby = await db.sessions
    .where("timestamp")
    .between(start, end, true, true)
    .toArray();

  return nearby.filter(
    (s) => Math.abs(s.amount_ml - candidate.amount_ml) <= toleranceMl,
  );
}
