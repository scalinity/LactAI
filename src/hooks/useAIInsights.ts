import { useState, useEffect, useRef, useCallback } from "react";
import { format } from "date-fns";
import { getInsights } from "@/lib/api";
import type { InsightsResponse, InsightsEntry } from "@/lib/api";
import type { RangePreset } from "@/types/common";
import type { Session } from "@/types/session";

const PERIOD_MAP: Record<RangePreset, string> = {
  "1W": "7d",
  "1M": "30d",
  "3M": "90d",
  "6M": "180d",
  "1Y": "365d",
  ALL: "all",
};

export const MIN_SESSIONS = 3;
const MAX_ENTRIES = 500;

function sessionsToEntries(sessions: Session[]): InsightsEntry[] {
  const sorted = [...sessions].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );
  const sliced = sorted.slice(-MAX_ENTRIES);

  return sliced.map((s) => {
    const entry: InsightsEntry = {
      timestamp_local: format(s.timestamp, "yyyy-MM-dd'T'HH:mm"),
      amount: s.amount_ml,
      unit: "ml",
    };
    if (s.session_type) entry.session_type = s.session_type;
    if (s.side && s.side !== "unknown") entry.side = s.side;
    if (s.duration_min != null && s.duration_min > 0)
      entry.duration_min = s.duration_min;
    if (s.amount_left_ml != null) entry.amount_left_ml = s.amount_left_ml;
    if (s.amount_right_ml != null) entry.amount_right_ml = s.amount_right_ml;
    return entry;
  });
}

export interface UseAIInsightsResult {
  insights: InsightsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAIInsights(
  rangePreset: RangePreset,
  sessions: Session[] | undefined,
): UseAIInsightsResult {
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, InsightsResponse>>(new Map());
  const abortRef = useRef<AbortController | null>(null);
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const [refreshKey, setRefreshKey] = useState(0);

  const period = PERIOD_MAP[rangePreset];
  const sessionCount = sessions?.length ?? 0;

  useEffect(() => {
    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    const currentSessions = sessionsRef.current;

    // Not enough data
    if (!currentSessions || currentSessions.length < MIN_SESSIONS) {
      setInsights(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Check cache (refetch deletes the entry before triggering re-run)
    const cached = cacheRef.current.get(period);
    if (cached) {
      setInsights(cached);
      setError(null);
      setLoading(false);
      return;
    }

    // Fetch
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    const entries = sessionsToEntries(currentSessions);

    getInsights(entries, period, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setInsights(result);
          setError(null);
          setLoading(false);
          cacheRef.current.set(period, result);
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const key = parseError(err);
        setError(key);
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
    // sessionCount is a stable proxy for sessions array identity
    // refreshKey triggers refetch after cache invalidation
  }, [period, sessionCount, refreshKey]);

  const refetch = useCallback(() => {
    cacheRef.current.delete(period);
    setRefreshKey((k) => k + 1);
  }, [period]);

  return { insights, loading, error, refetch };
}

/** Returns an i18n key for the error type */
function parseError(err: unknown): string {
  if (err instanceof DOMException && err.name === "AbortError") {
    return "insights.errorTimeout";
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (
      msg.includes("offline") ||
      msg.includes("network") ||
      msg.includes("failed to fetch")
    ) {
      return "insights.errorOffline";
    }
    if (msg.includes("429") || msg.includes("rate")) {
      return "insights.errorRateLimit";
    }
  }
  return "insights.errorGeneric";
}
