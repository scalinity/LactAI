import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./index";
import type { SessionFilter } from "@/types/session";
import { startOfDay, endOfDay } from "date-fns";

export function useSessions(filter?: SessionFilter) {
  return useLiveQuery(async () => {
    const collection = db.sessions.orderBy("timestamp");

    const results = await collection.reverse().toArray();

    return results.filter((s) => {
      if (filter?.startDate && s.timestamp < filter.startDate) return false;
      if (filter?.endDate && s.timestamp > filter.endDate) return false;
      if (filter?.side && s.side !== filter.side) return false;
      if (filter?.source && s.source !== filter.source) return false;
      if (filter?.session_type && s.session_type !== filter.session_type) return false;
      return true;
    });
  }, [
    filter?.startDate?.getTime(),
    filter?.endDate?.getTime(),
    filter?.side,
    filter?.source,
    filter?.session_type,
  ]);
}

export function useTodaySessions() {
  return useLiveQuery(async () => {
    const start = startOfDay(new Date());
    const end = endOfDay(new Date());
    return db.sessions
      .where("timestamp")
      .between(start, end, true, true)
      .toArray();
  });
}

export function useChatThreads() {
  return useLiveQuery(() =>
    db.chat_threads.orderBy("created_at").reverse().toArray(),
  );
}

export function useChatMessages(threadId: number | undefined) {
  return useLiveQuery(() => {
    if (!threadId) return [] as import("@/types/chat").ChatMessage[];
    return db.chat_messages
      .where("thread_id")
      .equals(threadId)
      .sortBy("created_at");
  }, [threadId]);
}

export function useUploads() {
  return useLiveQuery(() =>
    db.uploads.orderBy("created_at").reverse().toArray(),
  );
}
