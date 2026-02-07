import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./index";
import type { SessionFilter } from "@/types/session";
import { startOfDay, endOfDay } from "date-fns";

export function useSessions(filter?: SessionFilter) {
  return useLiveQuery(async () => {
    let collection;

    if (filter?.startDate && filter?.endDate) {
      collection = db.sessions
        .where("timestamp")
        .between(filter.startDate, filter.endDate, true, true);
    } else if (filter?.startDate) {
      collection = db.sessions
        .where("timestamp")
        .aboveOrEqual(filter.startDate);
    } else if (filter?.endDate) {
      collection = db.sessions
        .where("timestamp")
        .belowOrEqual(filter.endDate);
    } else {
      collection = db.sessions.orderBy("timestamp");
    }

    let filtered = collection;
    if (filter?.side || filter?.source || filter?.session_type) {
      filtered = collection.filter((s) => {
        if (filter?.side && s.side !== filter.side) return false;
        if (filter?.source && s.source !== filter.source) return false;
        if (filter?.session_type && s.session_type !== filter.session_type) return false;
        return true;
      });
    }

    return filtered.reverse().toArray();
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
