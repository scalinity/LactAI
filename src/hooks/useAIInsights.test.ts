import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAIInsights, MIN_SESSIONS } from "./useAIInsights";
import * as api from "@/lib/api";
import type { Session } from "@/types/session";
import type { InsightsResponse } from "@/lib/api";

vi.mock("@/lib/api");

const mockInsights: InsightsResponse = {
  summary: "Your output has been steady.",
  trends: [
    {
      metric: "daily_volume",
      direction: "stable",
      description: "Daily volume is stable at ~600ml",
    },
  ],
  patterns: [
    {
      type: "peak_time",
      description: "Morning sessions yield the most",
    },
  ],
  tips: [
    {
      tip: "Keep your schedule consistent",
      rationale: "Consistency correlates with steady output",
    },
  ],
};

function makeSessions(count: number): Session[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    timestamp: new Date(2025, 0, 15, 8 + i),
    amount_ml: 100 + i * 10,
    session_type: "pumping" as const,
    side: "both" as const,
    notes: "",
    source: "manual" as const,
  }));
}

describe("useAIInsights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getInsights).mockResolvedValue(mockInsights);
  });

  it("should export MIN_SESSIONS constant", () => {
    expect(MIN_SESSIONS).toBe(3);
  });

  it("should return null insights when sessions is undefined", () => {
    const { result } = renderHook(() => useAIInsights("1M", undefined));

    expect(result.current.insights).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should return null insights when sessions count < MIN_SESSIONS", () => {
    const sessions = makeSessions(2);
    const { result } = renderHook(() => useAIInsights("1M", sessions));

    expect(result.current.insights).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("should fetch insights when enough sessions are provided", async () => {
    const sessions = makeSessions(5);

    const { result } = renderHook(() => useAIInsights("1M", sessions));

    // Should start loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.insights).toEqual(mockInsights);
    expect(result.current.error).toBeNull();
    expect(api.getInsights).toHaveBeenCalledWith(
      expect.any(Array),
      "30d",
      expect.any(AbortSignal),
    );
  });

  it("should map range presets to correct period strings", async () => {
    const sessions = makeSessions(5);

    const { result, rerender } = renderHook(
      ({ preset }) => useAIInsights(preset, sessions),
      { initialProps: { preset: "1W" as const } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.getInsights).toHaveBeenCalledWith(
      expect.any(Array),
      "7d",
      expect.any(AbortSignal),
    );

    vi.clearAllMocks();
    rerender({ preset: "3M" as const });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.getInsights).toHaveBeenCalledWith(
      expect.any(Array),
      "90d",
      expect.any(AbortSignal),
    );
  });

  it("should cache results and not refetch for the same period", async () => {
    const sessions = makeSessions(5);

    const { result, rerender } = renderHook(
      ({ preset }) => useAIInsights(preset, sessions),
      { initialProps: { preset: "1M" as const } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.getInsights).toHaveBeenCalledTimes(1);

    // Switch to a different period
    rerender({ preset: "1W" as const });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.getInsights).toHaveBeenCalledTimes(2);

    // Switch back — should use cache
    vi.clearAllMocks();
    rerender({ preset: "1M" as const });

    // Cache should be used; no new fetch
    expect(result.current.insights).toEqual(mockInsights);
    expect(api.getInsights).not.toHaveBeenCalled();
  });

  it("should refetch and invalidate cache when refetch is called", async () => {
    const sessions = makeSessions(5);

    const { result } = renderHook(() => useAIInsights("1M", sessions));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.getInsights).toHaveBeenCalledTimes(1);

    const updatedInsights: InsightsResponse = {
      ...mockInsights,
      summary: "Updated summary",
    };
    vi.mocked(api.getInsights).mockResolvedValue(updatedInsights);

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.getInsights).toHaveBeenCalledTimes(2);
    expect(result.current.insights?.summary).toBe("Updated summary");
  });

  it("should return i18n error key on timeout", async () => {
    vi.mocked(api.getInsights).mockRejectedValue(
      new DOMException("The operation was aborted.", "AbortError"),
    );

    const sessions = makeSessions(5);
    const { result } = renderHook(() => useAIInsights("1M", sessions));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("insights.errorTimeout");
    expect(result.current.insights).toBeNull();
  });

  it("should return i18n error key on network error", async () => {
    vi.mocked(api.getInsights).mockRejectedValue(new Error("Failed to fetch"));

    const sessions = makeSessions(5);
    const { result } = renderHook(() => useAIInsights("1M", sessions));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("insights.errorOffline");
  });

  it("should return i18n error key on rate limit", async () => {
    vi.mocked(api.getInsights).mockRejectedValue(
      new Error("429 Too Many Requests"),
    );

    const sessions = makeSessions(5);
    const { result } = renderHook(() => useAIInsights("1M", sessions));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("insights.errorRateLimit");
  });

  it("should return generic i18n error key on unknown error", async () => {
    vi.mocked(api.getInsights).mockRejectedValue(new Error("Something broke"));

    const sessions = makeSessions(5);
    const { result } = renderHook(() => useAIInsights("1M", sessions));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("insights.errorGeneric");
  });

  it("should limit entries to 500", async () => {
    const sessions = makeSessions(600);
    renderHook(() => useAIInsights("1M", sessions));

    await waitFor(() => {
      expect(api.getInsights).toHaveBeenCalled();
    });

    const entries = vi.mocked(api.getInsights).mock.calls[0][0];
    expect(entries.length).toBe(500);
  });

  it("should include optional session fields in entries", async () => {
    const sessions: Session[] = [
      {
        id: 1,
        timestamp: new Date(2025, 0, 15, 8),
        amount_ml: 120,
        session_type: "pumping",
        side: "left",
        duration_min: 15,
        amount_left_ml: 70,
        amount_right_ml: 50,
        notes: "",
        source: "manual",
      },
      {
        id: 2,
        timestamp: new Date(2025, 0, 15, 12),
        amount_ml: 100,
        session_type: "feeding",
        side: "unknown",
        notes: "",
        source: "manual",
      },
      {
        id: 3,
        timestamp: new Date(2025, 0, 15, 16),
        amount_ml: 80,
        session_type: "pumping",
        side: "both",
        notes: "",
        source: "manual",
      },
    ];

    renderHook(() => useAIInsights("1M", sessions));

    await waitFor(() => {
      expect(api.getInsights).toHaveBeenCalled();
    });

    const entries = vi.mocked(api.getInsights).mock.calls[0][0];
    // First entry has all optional fields
    expect(entries[0].session_type).toBe("pumping");
    expect(entries[0].side).toBe("left");
    expect(entries[0].duration_min).toBe(15);
    expect(entries[0].amount_left_ml).toBe(70);
    expect(entries[0].amount_right_ml).toBe(50);

    // Second entry has "unknown" side — should be excluded
    expect(entries[1].side).toBeUndefined();
  });
});
