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
    this.version(2).stores({
      sessions: "++id, timestamp, side, source, session_type, created_at",
      uploads: "++id, created_at, ai_status",
      chat_threads: "++id, created_at",
      chat_messages: "++id, thread_id, created_at",
    });
  }
}

export const db = new ClaudiaFlowDB();
