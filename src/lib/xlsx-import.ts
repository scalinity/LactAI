import { read, utils } from "xlsx";
import { ozToMl } from "./units";
import type { Session } from "@/types/session";

const MAX_AMOUNT_ML = 500;
const MAX_ROWS = 50_000;

interface XlsxRow {
  Date: string | number | Date;
  Type: string;
  Time: string | number | Date;
  // Column D: left breast oz (Pump) or total fed oz (Feeding)
  [key: string]: unknown;
}

function stripControlChars(value: string): string {
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/**
 * Parse an XLSX file matching the ClaudiaData format:
 * Date | Type | Time | Volume Left/Fed (oz) | Volume Right (oz) | Total Volume (oz) | Note
 */
export async function parseXLSXFile(file: File): Promise<{
  sessions: Omit<Session, "id">[];
  feedCount: number;
  pumpCount: number;
  errors: string[];
}> {
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: "array", cellDates: true });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      sessions: [],
      feedCount: 0,
      pumpCount: 0,
      errors: ["No sheets found in workbook"],
    };
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = utils.sheet_to_json<XlsxRow>(sheet, { defval: "" });

  if (rows.length === 0) {
    return {
      sessions: [],
      feedCount: 0,
      pumpCount: 0,
      errors: ["Sheet has no data rows"],
    };
  }

  if (rows.length > MAX_ROWS) {
    return {
      sessions: [],
      feedCount: 0,
      pumpCount: 0,
      errors: [`Too many rows (${rows.length}). Maximum is ${MAX_ROWS}.`],
    };
  }

  // Detect column names from first row's keys
  const keys = Object.keys(rows[0]);
  // Column indices by position: Date(0), Type(1), Time(2), VolLeft(3), VolRight(4), Total(5), Note(6)
  const colDate = keys[0];
  const colType = keys[1];
  const colTime = keys[2];
  const colVolLeft = keys[3];
  const colVolRight = keys[4];
  const colTotal = keys[5];
  const colNote = keys[6];

  const sessions: Omit<Session, "id">[] = [];
  const errors: string[] = [];
  let feedCount = 0;
  let pumpCount = 0;
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed + header row

    // Parse date
    const rawDate = row[colDate];
    let dateObj: Date | null = null;
    if (rawDate instanceof Date) {
      dateObj = rawDate;
    } else if (typeof rawDate === "number") {
      // Excel serial date
      dateObj = excelSerialToDate(rawDate);
    } else if (typeof rawDate === "string" && rawDate.trim()) {
      dateObj = new Date(rawDate.trim());
    }

    if (!dateObj || isNaN(dateObj.getTime())) {
      errors.push(`Row ${rowNum}: invalid date`);
      continue;
    }

    // Parse time
    const rawTime = row[colTime];
    let hours = 0;
    let minutes = 0;
    if (rawTime instanceof Date) {
      hours = rawTime.getHours();
      minutes = rawTime.getMinutes();
    } else if (typeof rawTime === "number") {
      // Excel serial time (fraction of day)
      const totalMinutes = Math.round(rawTime * 24 * 60);
      hours = Math.floor(totalMinutes / 60) % 24;
      minutes = totalMinutes % 60;
    } else if (typeof rawTime === "string" && rawTime.trim()) {
      const parts = rawTime.trim().split(":");
      hours = parseInt(parts[0], 10) || 0;
      minutes = parseInt(parts[1], 10) || 0;
    }

    // Combine date + time
    const timestamp = new Date(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate(),
      hours,
      minutes,
      0,
      0,
    );

    if (timestamp > tomorrow) {
      errors.push(`Row ${rowNum}: date is in the future`);
      continue;
    }

    // Parse type
    const typeStr = String(row[colType] ?? "")
      .trim()
      .toLowerCase();
    let sessionType: "feeding" | "pumping";
    if (typeStr === "feeding" || typeStr === "feed") {
      sessionType = "feeding";
    } else if (typeStr === "pump" || typeStr === "pumping") {
      sessionType = "pumping";
    } else {
      errors.push(`Row ${rowNum}: unknown type "${typeStr}"`);
      continue;
    }

    // Parse amounts
    const volLeft = parseNum(row[colVolLeft]);
    const volRight = parseNum(row[colVolRight]);
    const totalOz = parseNum(row[colTotal]);

    if (totalOz === null || totalOz < 0) {
      errors.push(`Row ${rowNum}: missing or invalid total volume`);
      continue;
    }

    const amount_ml = ozToMl(totalOz);
    if (amount_ml > MAX_AMOUNT_ML) {
      errors.push(`Row ${rowNum}: amount exceeds ${MAX_AMOUNT_ML}ml`);
      continue;
    }

    // Build session
    const session: Omit<Session, "id"> = {
      timestamp,
      session_type: sessionType,
      amount_ml,
      amount_entered: totalOz,
      unit_entered: "oz",
      source: "imported",
      confidence: 1.0,
      created_at: now,
      updated_at: now,
    };

    // Pump sessions: set left/right and side
    if (sessionType === "pumping") {
      if (volLeft !== null && volLeft >= 0) {
        session.amount_left_ml = ozToMl(volLeft);
      }
      if (volRight !== null && volRight >= 0) {
        session.amount_right_ml = ozToMl(volRight);
      }
      if (session.amount_left_ml != null || session.amount_right_ml != null) {
        session.side = "both";
      }
    }

    // Parse note
    const rawNote = String(row[colNote] ?? "").trim();
    if (rawNote) {
      // Strip "Note: " prefix if present
      const cleaned = rawNote.startsWith("Note: ")
        ? rawNote.slice(6).trim()
        : rawNote;
      if (cleaned) {
        session.notes = stripControlChars(cleaned);
      }
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

function parseNum(val: unknown): number | null {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string") {
    const n = parseFloat(val.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function excelSerialToDate(serial: number): Date {
  // Excel epoch is Jan 0, 1900 (with the Lotus 123 leap year bug)
  const epoch = new Date(1899, 11, 30);
  return new Date(epoch.getTime() + serial * 86400000);
}
