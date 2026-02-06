import { db } from "@/db";
import type { Session } from "@/types/session";

const EXPORT_VERSION = 2;
const MAX_IMPORT_SESSIONS = 50_000;
const MAX_STRING_FIELD_LENGTH = 10_000;
const MAX_DURATION_MIN = 1440;
const MAX_AMOUNT_ML = 10_000;
const MAX_METADATA_FIELD_LENGTH = 50;
const VALID_SESSION_TYPES = new Set(["feeding", "pumping"]);
const AMOUNT_ROUND_FACTOR = 10; // 0.1ml precision for duplicate detection

interface ExportData {
  version: number;
  exported_at: string;
  sessions: Session[];
}

const ALLOWED_SESSION_KEYS = new Set([
  "timestamp",
  "amount_ml",
  "session_type",
  "side",
  "source",
  "amount_left_ml",
  "amount_right_ml",
  "duration_min",
  "notes",
  "created_at",
  "updated_at",
  "id",
]);

function truncateStringField(
  obj: Record<string, unknown>,
  field: string,
  maxLength: number,
): void {
  if (
    typeof obj[field] === "string" &&
    (obj[field] as string).length > maxLength
  ) {
    obj[field] = (obj[field] as string).slice(0, maxLength);
  }
}

function validateAndSanitizeSession(raw: unknown): raw is Partial<Session> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw))
    return false;
  const obj = raw as Record<string, unknown>;

  // Required fields
  if (!obj.timestamp || obj.amount_ml == null) return false;

  // Validate timestamp is a parseable date
  const ts = new Date(obj.timestamp as string | number | Date);
  if (isNaN(ts.getTime())) return false;

  if (typeof obj.amount_ml !== "number") return false;
  if (!Number.isFinite(obj.amount_ml)) return false;
  if (obj.amount_ml < 0 || obj.amount_ml > MAX_AMOUNT_ML) return false;

  // Strip unknown keys
  for (const key of Object.keys(obj)) {
    if (!ALLOWED_SESSION_KEYS.has(key)) {
      delete obj[key];
    }
  }

  // Validate and normalize session_type (matches useSessions.ts behavior)
  if (obj.session_type != null && typeof obj.session_type !== "string")
    return false;
  if (
    obj.session_type == null ||
    !VALID_SESSION_TYPES.has(obj.session_type as string)
  ) {
    obj.session_type = "feeding";
  }
  if (obj.side != null && typeof obj.side !== "string") return false;
  if (obj.source != null && typeof obj.source !== "string") return false;
  if (obj.notes != null && typeof obj.notes !== "string") return false;
  if (obj.duration_min != null && typeof obj.duration_min !== "number")
    return false;
  if (typeof obj.duration_min === "number") {
    if (
      Number.isNaN(obj.duration_min) ||
      obj.duration_min < 0 ||
      obj.duration_min > MAX_DURATION_MIN
    ) {
      return false;
    }
  }

  // Validate optional date fields
  if (obj.created_at != null) {
    const d = new Date(obj.created_at as string | number | Date);
    if (isNaN(d.getTime())) return false;
  }
  if (obj.updated_at != null) {
    const d = new Date(obj.updated_at as string | number | Date);
    if (isNaN(d.getTime())) return false;
  }

  // Truncate string fields to prevent oversized data
  truncateStringField(obj, "notes", MAX_STRING_FIELD_LENGTH);
  truncateStringField(obj, "session_type", MAX_METADATA_FIELD_LENGTH);
  truncateStringField(obj, "side", MAX_METADATA_FIELD_LENGTH);
  truncateStringField(obj, "source", MAX_METADATA_FIELD_LENGTH);

  return true;
}

function toValidDate(value: Date | string | number): Date {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date value in session data`);
  }
  return date;
}

export async function exportAllData(): Promise<string> {
  const sessions = await db.sessions.toArray();
  const validSessions: Session[] = [];

  for (const s of sessions) {
    try {
      s.timestamp = toValidDate(s.timestamp);
      s.created_at = toValidDate(s.created_at);
      s.updated_at = toValidDate(s.updated_at);
      validSessions.push(s);
    } catch {
      // Skip sessions with corrupted dates
    }
  }

  const data: ExportData = {
    version: EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    sessions: validSessions,
  };
  return JSON.stringify(data, null, 2);
}

export async function importData(
  jsonString: string,
): Promise<{ imported: number; skipped: number }> {
  let data: unknown;
  try {
    data = JSON.parse(jsonString);
  } catch {
    throw new Error("Invalid JSON format");
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error("Invalid backup file format");
  }

  const parsed = data as Record<string, unknown>;
  if (!parsed.version || !Array.isArray(parsed.sessions)) {
    throw new Error("Invalid backup file format");
  }

  if (parsed.sessions.length > MAX_IMPORT_SESSIONS) {
    throw new Error(
      `Import limited to ${MAX_IMPORT_SESSIONS.toLocaleString()} sessions`,
    );
  }

  let imported = 0;
  let skipped = 0;

  await db.transaction("rw", db.sessions, async () => {
    // Build composite key set for O(1) duplicate detection
    const allExisting = await db.sessions.toArray();
    const existingKeys = new Set<string>();
    for (const existing of allExisting) {
      const ts =
        existing.timestamp instanceof Date
          ? existing.timestamp.getTime()
          : new Date(existing.timestamp).getTime();
      if (isNaN(ts)) continue;
      if (!Number.isFinite(existing.amount_ml)) continue;
      const roundedAmount = Math.round(
        existing.amount_ml * AMOUNT_ROUND_FACTOR,
      );
      const normalizedType = existing.session_type ?? "feeding";
      existingKeys.add(`${ts}:${normalizedType}:${roundedAmount}`);
    }

    const sessionsToAdd: Session[] = [];

    for (const raw of parsed.sessions as unknown[]) {
      if (!validateAndSanitizeSession(raw)) {
        skipped++;
        continue;
      }

      const session = raw as Partial<Session>;
      const timestampMs = new Date(session.timestamp!).getTime();
      const roundedAmount = Math.round(
        (session.amount_ml ?? 0) * AMOUNT_ROUND_FACTOR,
      );
      const compositeKey = `${timestampMs}:${session.session_type}:${roundedAmount}`;
      const isDuplicate = existingKeys.has(compositeKey);

      if (isDuplicate) {
        skipped++;
        continue;
      }

      // Track this key to prevent intra-import duplicates
      existingKeys.add(compositeKey);

      const { id: _omitId, ...sessionWithoutId } = session;
      sessionsToAdd.push({
        ...sessionWithoutId,
        timestamp: new Date(session.timestamp!),
        created_at: new Date(session.created_at ?? new Date()),
        updated_at: new Date(session.updated_at ?? new Date()),
      } as Session);
    }

    if (sessionsToAdd.length > 0) {
      await db.sessions.bulkAdd(sessionsToAdd);
    }
    imported = sessionsToAdd.length;
  });

  return { imported, skipped };
}
