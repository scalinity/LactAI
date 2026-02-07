import { db } from "@/db";

export interface DeleteImportsResult {
  deleted: number;
  sources: string[];
}

/**
 * Delete all sessions with specific source values (imported, ocr, ai_vision)
 */
export async function deleteImportedSessions(
  sources: Array<"imported" | "ocr" | "ai_vision"> = ["imported", "ocr", "ai_vision"],
  afterDate?: Date
): Promise<DeleteImportsResult> {
  let deleted = 0;

  await db.transaction("rw", db.sessions, async () => {
    let query = db.sessions.where("source").anyOf(sources);
    
    if (afterDate) {
      query = query.and((s) => s.created_at >= afterDate);
    }
    
    deleted = await query.delete();
  });

  return { deleted, sources };
}

/**
 * Count sessions by source type
 */
export async function countSessionsBySource(): Promise<Record<string, number>> {
  const allSessions = await db.sessions.toArray();
  
  const counts: Record<string, number> = {
    manual: 0,
    imported: 0,
    ocr: 0,
    ai_vision: 0,
  };

  allSessions.forEach((session) => {
    const source = session.source || "manual";
    counts[source] = (counts[source] || 0) + 1;
  });

  return counts;
}

/**
 * Delete sessions imported after a specific date
 * @deprecated Use deleteImportedSessions with afterDate parameter instead
 */
export async function deleteImportsAfterDate(
  afterDate: Date,
  sources: Array<"imported" | "ocr" | "ai_vision"> = ["imported", "ocr", "ai_vision"]
): Promise<DeleteImportsResult> {
  return deleteImportedSessions(sources, afterDate);
}