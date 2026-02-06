import { db } from "@/db";
import type { Session } from "@/types/session";

const EXPORT_VERSION = 2;

interface ExportData {
  version: number;
  exported_at: string;
  sessions: Session[];
}

export async function exportAllData(): Promise<string> {
  const sessions = await db.sessions.toArray();
  const data: ExportData = {
    version: EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    sessions: sessions.map((s) => ({
      ...s,
      timestamp:
        s.timestamp instanceof Date ? s.timestamp : new Date(s.timestamp),
      created_at:
        s.created_at instanceof Date ? s.created_at : new Date(s.created_at),
      updated_at:
        s.updated_at instanceof Date ? s.updated_at : new Date(s.updated_at),
    })),
  };
  return JSON.stringify(data, null, 2);
}

export async function importData(
  jsonString: string,
): Promise<{ imported: number; skipped: number }> {
  const data: ExportData = JSON.parse(jsonString);
  if (!data.version || !data.sessions) {
    throw new Error("Invalid backup file format");
  }

  let imported = 0;
  let skipped = 0;

  for (const session of data.sessions) {
    const existing = await db.sessions
      .where("timestamp")
      .equals(new Date(session.timestamp))
      .first();

    if (
      existing &&
      Math.abs(existing.amount_ml - session.amount_ml) < 1 &&
      existing.session_type === session.session_type
    ) {
      skipped++;
      continue;
    }

    await db.sessions.add({
      ...session,
      id: undefined,
      timestamp: new Date(session.timestamp),
      created_at: new Date(session.created_at),
      updated_at: new Date(session.updated_at),
    });
    imported++;
  }

  return { imported, skipped };
}
