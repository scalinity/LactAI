import { db } from "@/db";
import type { Session, SessionFormData } from "@/types/session";
import { toMl } from "@/lib/units";

export function useSessionActions() {
  const createSession = async (data: SessionFormData): Promise<number> => {
    const amount_ml = toMl(parseFloat(data.amount), data.unit);
    const now = new Date();

    const id = await db.sessions.add({
      timestamp: data.timestamp,
      amount_ml,
      amount_entered: parseFloat(data.amount),
      unit_entered: data.unit,
      side: data.side || undefined,
      duration_min: data.duration_min ? parseInt(data.duration_min) : undefined,
      notes: data.notes || undefined,
      source: "manual",
      created_at: now,
      updated_at: now,
    });

    return id as number;
  };

  const updateSession = async (
    id: number,
    data: Partial<SessionFormData>,
  ): Promise<void> => {
    const updates: Partial<Session> = { updated_at: new Date() };

    if (data.amount !== undefined && data.unit !== undefined) {
      updates.amount_ml = toMl(parseFloat(data.amount), data.unit);
      updates.amount_entered = parseFloat(data.amount);
      updates.unit_entered = data.unit;
    }
    if (data.timestamp !== undefined) updates.timestamp = data.timestamp;
    if (data.side !== undefined) updates.side = data.side || undefined;
    if (data.duration_min !== undefined) {
      updates.duration_min = data.duration_min
        ? parseInt(data.duration_min)
        : undefined;
    }
    if (data.notes !== undefined) updates.notes = data.notes || undefined;

    await db.sessions.update(id, updates);
  };

  const deleteSession = async (id: number): Promise<void> => {
    await db.sessions.delete(id);
  };

  return { createSession, updateSession, deleteSession };
}
