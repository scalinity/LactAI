import { parse, set } from "date-fns";
import { ozToMl } from "./units";
import { findDuplicates } from "./dedupe";
import { db } from "@/db";
import type { Session } from "@/types/session";

export interface CsvImportResult {
  sessions: Omit<Session, "id">[];
  feedCount: number;
  pumpCount: number;
  errors: string[];
}

/**
 * Parse a feeding/pumping CSV log into Session objects.
 *
 * Expected headers:
 *   Date, Feed Time, Feed Amount (oz), Feed Notes, Pump Time, Pump IZQ, Pump DER, Pump Total
 *
 * Row types:
 *   - Feed rows have Feed Time + Feed Amount populated
 *   - Pump rows have Pump Time + Pump IZQ/DER/Total populated
 */
export function parseFeedingPumpingCSV(csvText: string): CsvImportResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      sessions: [],
      feedCount: 0,
      pumpCount: 0,
      errors: ["CSV has no data rows"],
    };
  }

  // Validate header
  const header = lines[0].toLowerCase();
  if (!header.includes("feed time") || !header.includes("pump time")) {
    return {
      sessions: [],
      feedCount: 0,
      pumpCount: 0,
      errors: [
        "Unrecognized CSV format: expected Feed Time and Pump Time columns",
      ],
    };
  }

  const sessions: Omit<Session, "id">[] = [];
  const errors: string[] = [];
  let feedCount = 0;
  let pumpCount = 0;
  const now = new Date();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVRow(lines[i]);
    if (cols.length < 8) {
      errors.push(`Row ${i + 1}: expected 8 columns, got ${cols.length}`);
      continue;
    }

    const [
      dateStr,
      feedTime,
      feedAmount,
      feedNotes,
      pumpTime,
      pumpIzq,
      pumpDer,
      pumpTotal,
    ] = cols;

    // Parse date (DD-MMM-YY format, e.g., "26-Jan-26")
    const baseDate = parseDate(dateStr.trim());
    if (!baseDate) {
      errors.push(`Row ${i + 1}: invalid date "${dateStr}"`);
      continue;
    }

    // Feed row
    if (feedTime.trim()) {
      const timestamp = combineDateTime(baseDate, feedTime.trim());
      if (!timestamp) {
        errors.push(`Row ${i + 1}: invalid feed time "${feedTime}"`);
      } else {
        const amountOz = parseFloat(feedAmount.trim());
        if (isNaN(amountOz) || amountOz <= 0) {
          errors.push(`Row ${i + 1}: invalid feed amount "${feedAmount}"`);
        } else {
          sessions.push({
            timestamp,
            session_type: "feeding",
            amount_ml: ozToMl(amountOz),
            amount_entered: amountOz,
            unit_entered: "oz",
            notes: feedNotes.trim() || undefined,
            source: "imported",
            confidence: 1.0,
            created_at: now,
            updated_at: now,
          });
          feedCount++;
        }
      }
    }

    // Pump row
    if (pumpTime.trim()) {
      const timestamp = combineDateTime(baseDate, pumpTime.trim());
      if (!timestamp) {
        errors.push(`Row ${i + 1}: invalid pump time "${pumpTime}"`);
      } else {
        const totalOz = parseFloat(pumpTotal.trim());
        const leftOz = parseFloat(pumpIzq.trim());
        const rightOz = parseFloat(pumpDer.trim());

        if (isNaN(totalOz) || totalOz <= 0) {
          errors.push(`Row ${i + 1}: invalid pump total "${pumpTotal}"`);
        } else {
          sessions.push({
            timestamp,
            session_type: "pumping",
            amount_ml: ozToMl(totalOz),
            amount_entered: totalOz,
            unit_entered: "oz",
            amount_left_ml: !isNaN(leftOz) ? ozToMl(leftOz) : undefined,
            amount_right_ml: !isNaN(rightOz) ? ozToMl(rightOz) : undefined,
            side: "both",
            source: "imported",
            confidence: 1.0,
            created_at: now,
            updated_at: now,
          });
          pumpCount++;
        }
      }
    }
  }

  return { sessions, feedCount, pumpCount, errors };
}

/**
 * Import parsed sessions into the database with deduplication.
 */
export async function importCSVSessions(
  sessions: Omit<Session, "id">[],
): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  await db.transaction("rw", db.sessions, async () => {
    for (const session of sessions) {
      const dupes = await findDuplicates({
        timestamp: session.timestamp,
        amount_ml: session.amount_ml,
      });

      // Post-filter: only count as duplicate if session_type matches
      const typeMatching = dupes.filter(
        (d) =>
          d.session_type === session.session_type ||
          d.session_type === undefined,
      );

      if (typeMatching.length > 0) {
        skipped++;
        continue;
      }

      await db.sessions.add({ ...session, id: undefined });
      imported++;
    }
  });

  return { imported, skipped };
}

// --- Helpers ---

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseDate(dateStr: string): Date | null {
  try {
    // "26-Jan-26" -> dd-MMM-yy
    const parsed = parse(dateStr, "dd-MMM-yy", new Date());
    if (isNaN(parsed.getTime())) return null;
    return parsed;
  } catch {
    return null;
  }
}

function combineDateTime(baseDate: Date, timeStr: string): Date | null {
  try {
    // "6:30 am" or "2:45 pm" -> h:mm a
    const timeParsed = parse(timeStr, "h:mm a", new Date());
    if (isNaN(timeParsed.getTime())) return null;

    return set(baseDate, {
      hours: timeParsed.getHours(),
      minutes: timeParsed.getMinutes(),
      seconds: 0,
      milliseconds: 0,
    });
  } catch {
    return null;
  }
}
