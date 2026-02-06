import { parse, set } from "date-fns";
import { ozToMl } from "./units";
import { db } from "@/db";
import type { Session } from "@/types/session";

export interface CsvImportResult {
  sessions: Omit<Session, "id">[];
  feedCount: number;
  pumpCount: number;
  errors: string[];
}

type CsvFormat =
  | "export-13column"
  | "external-8column"
  | "pivot-daily"
  | "unknown";

// Validation constants
const MAX_AMOUNT_ML = 500; // Biological maximum per session
const MAX_DURATION_MIN = 120; // 2 hours maximum
const VALID_SOURCES = ["manual", "imported", "ocr", "ai_vision"] as const;

// Security: Strip control characters (preserves tabs/newlines for notes)
function stripControlChars(value: string): string {
  if (!value || typeof value !== "string") return value;
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

// Security: Sanitize CSV fields to prevent formula injection
function sanitizeCSVField(value: string): string {
  if (!value || typeof value !== "string") return value;
  const clean = stripControlChars(value);
  // Escape formula prefixes to prevent execution in Excel/Google Sheets
  if (/^[=+\-@\t\r]/.test(clean)) {
    return "'" + clean;
  }
  return clean;
}

// Helper: Parse and validate positive finite numbers
function parsePositiveFiniteNumber(str: string): number | null {
  const num = parseFloat(str);
  return !isNaN(num) && num > 0 && Number.isFinite(num) ? num : null;
}

/**
 * Parse a feeding/pumping CSV log into Session objects.
 * Auto-detects between three formats:
 *   1. Export format (13 columns): Date, Time, Type, Amount (ml), Amount (oz), Side, Left (ml), Left (oz), Right (ml), Right (oz), Duration (min), Notes, Source
 *   2. External format (8 columns): Date, Feed Time, Feed Amount (oz), Feed Notes, Pump Time, Pump IZQ, Pump DER, Pump Total
 *   3. Pivot-daily format (4 columns): Date, Feeding, Pump, Grand Total (daily aggregates from Google Sheets)
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

  // Try pivot-daily detection first (may have a title row before headers)
  // Check line 0 and line 1 for pivot headers
  for (let headerIdx = 0; headerIdx < Math.min(2, lines.length); headerIdx++) {
    const candidateHeaders = parseCSVRow(lines[headerIdx]).map((h) =>
      h.trim().toLowerCase(),
    );
    if (isPivotDailyHeaders(candidateHeaders)) {
      return parsePivotDailyFormat(lines, headerIdx);
    }
  }

  // Detect format from headers (parse once, reuse for format-specific parser)
  const headerLine = lines[0];
  const headers = parseCSVRow(headerLine).map((h) =>
    h.trim().replace(/[\x00-\x1F\x7F]/g, ""),
  ); // Remove control characters
  const headersLower = headers.map((h) => h.toLowerCase());
  const format = detectCsvFormat(headersLower);

  if (format === "unknown") {
    return {
      sessions: [],
      feedCount: 0,
      pumpCount: 0,
      errors: [
        "Unrecognized CSV format. Expected ClaudiaFlow export format (13 columns), external import format (8 columns), or pivot-daily format (Date, Feeding, Pump, Grand Total).",
      ],
    };
  }

  // Route to appropriate parser (pass pre-parsed headers to avoid re-parsing)
  if (format === "export-13column") {
    return parse13ColumnFormat(lines, headers);
  } else {
    return parse8ColumnFormat(lines);
  }
}

/**
 * Import parsed sessions into the database with deduplication.
 */
export async function importCSVSessions(
  sessions: Omit<Session, "id">[],
): Promise<{ imported: number; skipped: number; skippedItems: string[] }> {
  let imported = 0;
  let skipped = 0;
  const skippedItems: string[] = [];
  const MAX_SKIPPED_ITEMS = 1000;

  await db.transaction("rw", db.sessions, async () => {
    // Performance: Batch fetch all potential duplicates (single query vs N queries)
    const timestamps = sessions.map((s) => s.timestamp);

    const existingSessions = await db.sessions
      .where("timestamp")
      .anyOf(timestamps)
      .toArray();

    // Build lookup map for O(1) duplicate detection
    const existingMap = new Map<string, Session[]>();
    existingSessions.forEach((s) => {
      const key = `${s.timestamp.getTime()}_${s.amount_ml}_${s.session_type || "feeding"}`;
      if (!existingMap.has(key)) {
        existingMap.set(key, []);
      }
      existingMap.get(key)!.push(s);
    });

    for (const session of sessions) {
      const key = `${session.timestamp.getTime()}_${session.amount_ml}_${session.session_type || "feeding"}`;
      const dupes = existingMap.get(key) || [];

      // Normalize undefined session_type to "feeding" for comparison
      // (legacy sessions before session_type was added default to feeding)
      const normalizeType = (t: string | undefined) => t || "feeding";
      const typeMatching = dupes.filter(
        (d) =>
          normalizeType(d.session_type) === normalizeType(session.session_type),
      );

      if (typeMatching.length > 0) {
        skipped++;
        if (skippedItems.length < MAX_SKIPPED_ITEMS) {
          skippedItems.push(
            `${session.timestamp.toISOString()} ${session.session_type || "feeding"} ${session.amount_ml}ml`,
          );
        }
        continue;
      }

      // Normalize session_type before storing
      await db.sessions.add({
        ...session,
        session_type: session.session_type || "feeding",
        id: undefined,
      });
      imported++;
    }
  });

  return { imported, skipped, skippedItems };
}

// --- Format Detection ---

function isPivotDailyHeaders(headers: string[]): boolean {
  const hasDate = headers.some((h) => h === "date");
  const hasFeeding = headers.some((h) => h === "feeding");
  const hasPump = headers.some((h) => h === "pump");
  return hasDate && hasFeeding && hasPump;
}

function detectCsvFormat(headers: string[]): CsvFormat {
  // Pivot-daily is detected separately in parseFeedingPumpingCSV
  // so we only check 13-column and 8-column here

  // 13-column export format signature: exact matches to avoid false positives
  const hasType = headers.some((h) => h === "type");
  const hasSide = headers.some((h) => h === "side");
  const hasAmountMl = headers.some(
    (h) => h === "amount (ml)" || (h.includes("amount") && h.includes("ml")),
  );
  const hasLeftMl = headers.some(
    (h) => h === "left (ml)" || (h.includes("left") && h.includes("ml")),
  );

  if (hasType && hasSide && hasAmountMl && hasLeftMl) {
    return "export-13column";
  }

  // 8-column external format signature: stricter matching with word boundaries
  const hasFeedTime = headers.some(
    (h) => h === "feed time" || /^feed\s+time$/i.test(h),
  );
  const hasPumpTime = headers.some(
    (h) => h === "pump time" || /^pump\s+time$/i.test(h),
  );
  // Match "pump izq" or "pump iq" but require "pump" prefix to avoid false positives
  const hasPumpIzq = headers.some(
    (h) => h.includes("pump") && /\b(izq|iq)\b/i.test(h),
  );

  if (hasFeedTime && hasPumpTime && hasPumpIzq) {
    return "external-8column";
  }

  return "unknown";
}

// --- 13-Column Parser ---

function parse13ColumnFormat(
  lines: string[],
  headers: string[],
): CsvImportResult {
  // Headers already parsed and passed in - no need to re-parse
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
      errors.push(
        `Row ${i + 1}: expected ${headers.length} columns, got ${cols.length}`,
      );
      continue;
    }

    // Extract required fields
    const dateStr = getCol(cols, "date");
    const timeStr = getCol(cols, "time");
    const typeStr = getCol(cols, "type");

    // Validate date/time (sanitize error messages - don't leak data)
    if (!dateStr || !timeStr) {
      errors.push(`Row ${i + 1}: missing date or time`);
      continue;
    }

    const timestamp = parseDateTimeISO(dateStr, timeStr);
    if (!timestamp) {
      errors.push(`Row ${i + 1}: invalid date/time format`);
      continue;
    }

    // Validate future dates (warn about likely data entry errors)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (timestamp > tomorrow) {
      errors.push(`Row ${i + 1}: date is in the future (${dateStr})`);
      continue;
    }

    // Validate type
    const sessionType = typeStr.toLowerCase();
    if (sessionType !== "feeding" && sessionType !== "pumping") {
      errors.push(
        `Row ${i + 1}: invalid type. Expected "feeding" or "pumping"`,
      );
      continue;
    }

    // Extract amount (prefer ml, fallback to oz) with finite number validation
    const amountMl = parsePositiveFiniteNumber(getCol(cols, "amount (ml)"));
    const amountOz = parsePositiveFiniteNumber(getCol(cols, "amount (oz)"));

    let amount_ml: number;
    let amount_entered: number;
    let unit_entered: "ml" | "oz";

    if (amountMl !== null) {
      amount_ml = amountMl;
      amount_entered = amountMl;
      unit_entered = "ml";
    } else if (amountOz !== null) {
      amount_ml = ozToMl(amountOz);
      amount_entered = amountOz;
      unit_entered = "oz";
    } else {
      errors.push(`Row ${i + 1}: missing or invalid amount`);
      continue;
    }

    // Validate upper bounds
    if (amount_ml > MAX_AMOUNT_ML) {
      errors.push(`Row ${i + 1}: amount exceeds maximum (${MAX_AMOUNT_ML}ml)`);
      continue;
    }

    // Extract optional fields
    const sideStr = getCol(cols, "side");
    const leftMl = parsePositiveFiniteNumber(getCol(cols, "left (ml)"));
    const leftOz = parsePositiveFiniteNumber(getCol(cols, "left (oz)"));
    const rightMl = parsePositiveFiniteNumber(getCol(cols, "right (ml)"));
    const rightOz = parsePositiveFiniteNumber(getCol(cols, "right (oz)"));
    const durationStr = getCol(cols, "duration (min)");
    const notes = getCol(cols, "notes");
    const sourceField = getCol(cols, "source");

    // Validate and sanitize source field
    const validatedSource = VALID_SOURCES.includes(sourceField as any)
      ? (sourceField as (typeof VALID_SOURCES)[number])
      : "imported";

    // Build session
    const session: Omit<Session, "id"> = {
      timestamp,
      session_type: sessionType as "feeding" | "pumping",
      amount_ml,
      amount_entered,
      unit_entered,
      source: validatedSource,
      confidence: 1.0,
      created_at: now,
      updated_at: now,
    };

    // Add side if present and valid
    if (sideStr) {
      const normalizedSide = sideStr.toLowerCase();
      if (["left", "right", "both", "unknown"].includes(normalizedSide)) {
        session.side = normalizedSide as "left" | "right" | "both" | "unknown";
      }
    }

    // Add left/right amounts if present (consistent validation: reject zero)
    if (leftMl !== null) {
      session.amount_left_ml = leftMl;
    } else if (leftOz !== null) {
      session.amount_left_ml = ozToMl(leftOz);
    }

    if (rightMl !== null) {
      session.amount_right_ml = rightMl;
    } else if (rightOz !== null) {
      session.amount_right_ml = ozToMl(rightOz);
    }

    // Add duration if present with bounds validation
    const duration = parsePositiveFiniteNumber(durationStr);
    if (duration !== null) {
      if (duration <= MAX_DURATION_MIN) {
        session.duration_min = duration;
      } else {
        errors.push(
          `Row ${i + 1}: duration exceeds maximum (${MAX_DURATION_MIN} minutes)`,
        );
        continue;
      }
    }

    // Sanitize and add notes if present
    if (notes) {
      session.notes = sanitizeCSVField(notes);
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
      errors.push(`Row ${i + 1}: invalid date format`);
      continue;
    }

    // Validate future dates
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (baseDate > tomorrow) {
      errors.push(`Row ${i + 1}: date is in the future`);
      continue;
    }

    // Feed row
    if (feedTime.trim()) {
      const timestamp = combineDateTime(baseDate, feedTime.trim());
      if (!timestamp) {
        errors.push(`Row ${i + 1}: invalid feed time format`);
      } else {
        const amountOz = parsePositiveFiniteNumber(feedAmount.trim());
        if (amountOz === null) {
          errors.push(`Row ${i + 1}: invalid feed amount`);
        } else if (ozToMl(amountOz) > MAX_AMOUNT_ML) {
          errors.push(`Row ${i + 1}: feed amount exceeds maximum`);
        } else {
          sessions.push({
            timestamp,
            session_type: "feeding",
            amount_ml: ozToMl(amountOz),
            amount_entered: amountOz,
            unit_entered: "oz",
            notes: feedNotes.trim()
              ? sanitizeCSVField(feedNotes.trim())
              : undefined,
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
        errors.push(`Row ${i + 1}: invalid pump time format`);
      } else {
        const totalOz = parsePositiveFiniteNumber(pumpTotal.trim());
        const leftOz = parsePositiveFiniteNumber(pumpIzq.trim());
        const rightOz = parsePositiveFiniteNumber(pumpDer.trim());

        if (totalOz === null) {
          errors.push(`Row ${i + 1}: invalid pump total`);
        } else if (ozToMl(totalOz) > MAX_AMOUNT_ML) {
          errors.push(`Row ${i + 1}: pump total exceeds maximum`);
        } else {
          sessions.push({
            timestamp,
            session_type: "pumping",
            amount_ml: ozToMl(totalOz),
            amount_entered: totalOz,
            unit_entered: "oz",
            amount_left_ml: leftOz !== null ? ozToMl(leftOz) : undefined,
            amount_right_ml: rightOz !== null ? ozToMl(rightOz) : undefined,
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

// --- Pivot-Daily Parser (Google Sheets pivot table) ---

function parsePivotDailyFormat(
  lines: string[],
  headerLineIdx: number,
): CsvImportResult {
  const sessions: Omit<Session, "id">[] = [];
  const errors: string[] = [];
  let feedCount = 0;
  let pumpCount = 0;
  const now = new Date();

  // Parse headers to find column indices
  const headers = parseCSVRow(lines[headerLineIdx]).map((h) =>
    h.trim().toLowerCase(),
  );
  const dateIdx = headers.indexOf("date");
  const feedingIdx = headers.indexOf("feeding");
  const pumpIdx = headers.indexOf("pump");

  // Validate required column indices
  if (dateIdx === -1 || feedingIdx === -1 || pumpIdx === -1) {
    return {
      sessions: [],
      feedCount: 0,
      pumpCount: 0,
      errors: ["Pivot format missing required columns: Date, Feeding, Pump"],
    };
  }

  for (let i = headerLineIdx + 1; i < lines.length; i++) {
    const cols = parseCSVRow(lines[i]);

    const rawDate = cols[dateIdx]?.trim() || "";
    // Sanitize date field to prevent formula injection
    const dateStr = sanitizeCSVField(rawDate);

    // Skip Grand Total or any summary row
    if (
      rawDate.toLowerCase().includes("grand total") ||
      rawDate.toLowerCase().includes("total")
    ) {
      continue;
    }

    // Parse date in M/D/YYYY format
    let timestamp: Date | null = null;
    try {
      const parsed = parse(rawDate, "M/d/yyyy", new Date());
      if (!isNaN(parsed.getTime())) {
        timestamp = set(parsed, {
          hours: 12,
          minutes: 0,
          seconds: 0,
          milliseconds: 0,
        });
      }
    } catch {
      // Fall through to error
    }

    if (!timestamp) {
      errors.push(`Row ${i + 1}: invalid date '${dateStr}'`);
      continue;
    }

    // Parse feeding amount (strip commas for large numbers like "3,946.60")
    // No MAX_AMOUNT_ML validation — these are daily aggregated totals, not individual sessions
    const feedingRaw = cols[feedingIdx]?.trim().replace(/,/g, "") || "";
    const feedingOz = parseFloat(feedingRaw);

    if (!isNaN(feedingOz) && feedingOz > 0 && Number.isFinite(feedingOz)) {
      sessions.push({
        timestamp,
        session_type: "feeding",
        amount_ml: ozToMl(feedingOz),
        amount_entered: feedingOz,
        unit_entered: "oz",
        notes: "Daily aggregate from pivot table",
        source: "imported",
        confidence: 1.0,
        created_at: now,
        updated_at: now,
      });
      feedCount++;
    }

    // Parse pump amount (strip commas)
    const pumpRaw = cols[pumpIdx]?.trim().replace(/,/g, "") || "";
    const pumpOz = parseFloat(pumpRaw);

    if (!isNaN(pumpOz) && pumpOz > 0 && Number.isFinite(pumpOz)) {
      sessions.push({
        timestamp,
        session_type: "pumping",
        amount_ml: ozToMl(pumpOz),
        amount_entered: pumpOz,
        unit_entered: "oz",
        notes: "Daily aggregate from pivot table",
        source: "imported",
        confidence: 1.0,
        created_at: now,
        updated_at: now,
      });
      pumpCount++;
    }
  }

  return { sessions, feedCount, pumpCount, errors };
}

// --- Helpers ---

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  const chars: string[] = []; // Use array buffer for O(n) instead of O(n²)
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        chars.push('"');
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(chars.join(""));
      chars.length = 0; // Clear array efficiently
    } else {
      chars.push(ch);
    }
  }
  result.push(chars.join(""));
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
