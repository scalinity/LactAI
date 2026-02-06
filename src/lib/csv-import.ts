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

type CsvFormat = "export-13column" | "external-8column" | "unknown";

/**
 * Parse a feeding/pumping CSV log into Session objects.
 * Auto-detects between two formats:
 *   1. Export format (13 columns): Date, Time, Type, Amount (ml), Amount (oz), Side, Left (ml), Left (oz), Right (ml), Right (oz), Duration (min), Notes, Source
 *   2. External format (8 columns): Date, Feed Time, Feed Amount (oz), Feed Notes, Pump Time, Pump IZQ, Pump DER, Pump Total
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

  // Detect format from headers
  const headerLine = lines[0];
  const headers = parseCSVRow(headerLine).map((h) => h.trim().toLowerCase());
  const format = detectCsvFormat(headers);

  if (format === "unknown") {
    return {
      sessions: [],
      feedCount: 0,
      pumpCount: 0,
      errors: [
        "Unrecognized CSV format. Expected either ClaudiaFlow export format (13 columns) or external import format (8 columns).",
      ],
    };
  }

  // Route to appropriate parser
  if (format === "export-13column") {
    return parse13ColumnFormat(lines);
  } else {
    return parse8ColumnFormat(lines);
  }
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

// --- Format Detection ---

function detectCsvFormat(headers: string[]): CsvFormat {
  // 13-column export format signature: has Type, Side, and ml columns
  const hasType = headers.some((h) => h === "type");
  const hasSide = headers.some((h) => h === "side");
  const hasAmountMl = headers.some((h) => h.includes("amount") && h.includes("ml"));
  const hasLeftMl = headers.some((h) => h.includes("left") && h.includes("ml"));
  
  if (hasType && hasSide && hasAmountMl && hasLeftMl) {
    return "export-13column";
  }

  // 8-column external format signature: has Feed Time, Pump Time, and specific Spanish labels
  const hasFeedTime = headers.some((h) => h.includes("feed") && h.includes("time"));
  const hasPumpTime = headers.some((h) => h.includes("pump") && h.includes("time"));
  const hasPumpIzq = headers.some((h) => h.includes("izq") || h.includes("iq"));
  
  if (hasFeedTime && hasPumpTime && hasPumpIzq) {
    return "external-8column";
  }

  return "unknown";
}

// --- 13-Column Parser ---

function parse13ColumnFormat(lines: string[]): CsvImportResult {
  const headers = parseCSVRow(lines[0]).map((h) => h.trim());
  const sessions: Omit<Session, "id">[] = [];
  const errors: string[] = [];
  let feedCount = 0;
  let pumpCount = 0;
  const now = new Date();

  // Create header index map
  const headerMap = new Map<string, number>();
  headers.forEach((h, i) => headerMap.set(h.toLowerCase(), i));

  const getCol = (row: string[], headerName: string): string => {
    const idx = headerMap.get(headerName.toLowerCase());
    return idx !== undefined ? row[idx]?.trim() || "" : "";
  };

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVRow(lines[i]);
    
    if (cols.length !== headers.length) {
      errors.push(`Row ${i + 1}: expected ${headers.length} columns, got ${cols.length}`);
      continue;
    }

    // Extract required fields
    const dateStr = getCol(cols, "date");
    const timeStr = getCol(cols, "time");
    const typeStr = getCol(cols, "type");

    // Validate date/time
    if (!dateStr || !timeStr) {
      errors.push(`Row ${i + 1}: missing date or time`);
      continue;
    }

    const timestamp = parseDateTimeISO(dateStr, timeStr);
    if (!timestamp) {
      errors.push(`Row ${i + 1}: invalid date/time "${dateStr} ${timeStr}"`);
      continue;
    }

    // Validate type
    const sessionType = typeStr.toLowerCase();
    if (sessionType !== "feeding" && sessionType !== "pumping") {
      errors.push(`Row ${i + 1}: invalid type "${typeStr}". Expected "feeding" or "pumping"`);
      continue;
    }

    // Extract amount (prefer ml, fallback to oz)
    const amountMl = parseFloat(getCol(cols, "amount (ml)"));
    const amountOz = parseFloat(getCol(cols, "amount (oz)"));
    
    let amount_ml: number;
    let amount_entered: number;
    let unit_entered: "ml" | "oz";

    if (!isNaN(amountMl) && amountMl > 0) {
      amount_ml = amountMl;
      amount_entered = amountMl;
      unit_entered = "ml";
    } else if (!isNaN(amountOz) && amountOz > 0) {
      amount_ml = ozToMl(amountOz);
      amount_entered = amountOz;
      unit_entered = "oz";
    } else {
      errors.push(`Row ${i + 1}: missing or invalid amount`);
      continue;
    }

    // Extract optional fields
    const sideStr = getCol(cols, "side");
    const leftMl = parseFloat(getCol(cols, "left (ml)"));
    const leftOz = parseFloat(getCol(cols, "left (oz)"));
    const rightMl = parseFloat(getCol(cols, "right (ml)"));
    const rightOz = parseFloat(getCol(cols, "right (oz)"));
    const durationStr = getCol(cols, "duration (min)");
    const notes = getCol(cols, "notes");
    const source = getCol(cols, "source") || "imported";

    // Build session
    const session: Omit<Session, "id"> = {
      timestamp,
      session_type: sessionType as "feeding" | "pumping",
      amount_ml,
      amount_entered,
      unit_entered,
      source: source as any,
      confidence: 1.0,
      created_at: now,
      updated_at: now,
    };

    // Add side if present
    if (sideStr && ["left", "right", "both", "unknown"].includes(sideStr.toLowerCase())) {
      session.side = sideStr.toLowerCase() as any;
    }

    // Add left/right amounts if present
    if (!isNaN(leftMl) && leftMl >= 0) {
      session.amount_left_ml = leftMl;
    } else if (!isNaN(leftOz) && leftOz >= 0) {
      session.amount_left_ml = ozToMl(leftOz);
    }

    if (!isNaN(rightMl) && rightMl >= 0) {
      session.amount_right_ml = rightMl;
    } else if (!isNaN(rightOz) && rightOz >= 0) {
      session.amount_right_ml = ozToMl(rightOz);
    }

    // Add duration if present
    const duration = parseFloat(durationStr);
    if (!isNaN(duration) && duration > 0) {
      session.duration_min = duration;
    }

    // Add notes if present
    if (notes) {
      session.notes = notes;
    }

    sessions.push(session);
    if (sessionType === "feeding") {
      feedCount++;
    } else {
      pumpCount++;
    }
  }

  return { sessions, feedCount, pumpCount, errors };
}

// --- 8-Column Parser (existing logic) ---

function parse8ColumnFormat(lines: string[]): CsvImportResult {
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

function parseDateTimeISO(dateStr: string, timeStr: string): Date | null {
  try {
    // Parse "YYYY-MM-DD" + "HH:mm" format
    const datetimeStr = `${dateStr} ${timeStr}`;
    const parsed = parse(datetimeStr, "yyyy-MM-dd HH:mm", new Date());
    if (isNaN(parsed.getTime())) return null;
    return parsed;
  } catch {
    return null;
  }
}
