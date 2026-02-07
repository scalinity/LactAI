import Dexie, { type Table } from "dexie";
import type { Session } from "@/types/session";
import type { Upload } from "@/types/upload";
import type { ChatThread, ChatMessage } from "@/types/chat";

export class ClaudiaFlowDB extends Dexie {
  sessions!: Table<Session>;
  uploads!: Table<Upload>;
  chat_threads!: Table<ChatThread>;
  chat_messages!: Table<ChatMessage>;

  constructor() {
    super("claudiaflow");
    this.version(1).stores({
      sessions: "++id, timestamp, side, source, created_at",
      uploads: "++id, created_at, ai_status",
      chat_threads: "++id, created_at",
      chat_messages: "++id, thread_id, created_at",
    });
    this.version(2)
      .stores({
        sessions: "++id, timestamp, side, source, session_type, created_at",
        uploads: "++id, created_at, ai_status",
        chat_threads: "++id, created_at",
        chat_messages: "++id, thread_id, created_at",
      })
      .upgrade((tx) => {
        return tx
          .table("sessions")
          .toCollection()
          .modify((session) => {
            if (!session.session_type) {
              session.session_type = "feeding";
            }
          });
      });
    this.version(3)
      .stores({
        sessions: "++id, timestamp, side, source, session_type, created_at",
        uploads: "++id, created_at, ai_status",
        chat_threads: "++id, created_at",
        chat_messages: "++id, thread_id, created_at",
      })
      .upgrade(async (tx) => {
        const sessions = await tx.table("sessions").toArray();
        if (sessions.length < 10) return;

        const amounts = sessions.map((s: Session) => s.amount_ml);
        const mean =
          amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length;
        const variance =
          amounts.reduce((sum: number, v: number) => sum + (v - mean) ** 2, 0) /
          amounts.length;
        const stdDev = Math.sqrt(variance);

        const idsToDelete = sessions
          .filter(
            (s: Session) =>
              s.amount_ml < 5 || Math.abs(s.amount_ml - mean) > 2 * stdDev,
          )
          .map((s: Session) => s.id!);

        if (idsToDelete.length > 0) {
          await tx.table("sessions").bulkDelete(idsToDelete);
        }
      });
  }
}

export const db = new ClaudiaFlowDB();
