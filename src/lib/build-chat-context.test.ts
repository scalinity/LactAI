import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildChatContext } from "./build-chat-context";
import { db } from "@/db";
import type { Session } from "@/types/session";

function makeSession(
  date: string,
  amount: number,
  overrides?: Partial<Session>,
): Session {
  return {
    timestamp: new Date(date),
    amount_ml: amount,
    amount_entered: amount,
    unit_entered: "ml",
    source: "manual",
    created_at: new Date(date),
    updated_at: new Date(date),
    ...overrides,
  };
}

function makePump(
  date: string,
  amount: number,
  overrides?: Partial<Session>,
): Session {
  return makeSession(date, amount, { session_type: "pumping", ...overrides });
}

function makeFeed(
  date: string,
  amount: number,
  overrides?: Partial<Session>,
): Session {
  return makeSession(date, amount, { session_type: "feeding", ...overrides });
}

// Pin time to Jan 20, 2025 at 2pm for deterministic test windows
const NOW = new Date("2025-01-20T14:00:00");

describe("buildChatContext", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Empty / Zero-Data States ---

  describe("empty states", () => {
    it("should return empty summary and zero count when no sessions exist", async () => {
      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toBe("");
      expect(ctx.session_count).toBe(0);
    });

    it("should return thread summaries even when no sessions exist", async () => {
      await db.chat_threads.bulkAdd([
        { title: "Pump output concern", created_at: new Date("2025-01-18") },
        { title: "Sleep schedule advice", created_at: new Date("2025-01-19") },
      ]);

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toBe("");
      expect(ctx.session_count).toBe(0);
      expect(ctx.thread_summaries).toBeDefined();
      expect(ctx.thread_summaries).toContain("Pump output concern");
      expect(ctx.thread_summaries).toContain("Sleep schedule advice");
    });
  });

  // --- Basic Context Generation ---

  describe("basic context generation", () => {
    it("should produce a data summary with today section for sessions logged today", async () => {
      await db.sessions.bulkAdd([
        makePump("2025-01-20T08:00:00", 120),
        makePump("2025-01-20T10:00:00", 100),
        makeFeed("2025-01-20T12:00:00", 80),
      ]);

      const ctx = await buildChatContext("ml");
      expect(ctx.session_count).toBe(3);
      expect(ctx.data_summary).toContain("### Today");
      expect(ctx.data_summary).toContain("Pumping: 2 sessions");
      expect(ctx.data_summary).toContain("Feeding: 1 sessions");
    });

    it("should list all individual today sessions without cap", async () => {
      const sessions = Array.from({ length: 12 }, (_, i) =>
        makePump(`2025-01-20T${String(6 + i).padStart(2, "0")}:00:00`, 100),
      );
      await db.sessions.bulkAdd(sessions);

      const ctx = await buildChatContext("ml");
      // Count individual session lines (start with "- ")
      const sessionLines = ctx.data_summary
        .split("\n")
        .filter((l) => l.startsWith("- ") && l.includes("100 ml"));
      expect(sessionLines.length).toBe(12);
      expect(ctx.data_summary).not.toContain("...and");
    });

    it("should produce a 7-day section with pump/feed stats", async () => {
      // Sessions across last 7 days
      await db.sessions.bulkAdd([
        makePump("2025-01-14T08:00:00", 100),
        makePump("2025-01-16T08:00:00", 120),
        makeFeed("2025-01-18T08:00:00", 80),
        makeFeed("2025-01-19T08:00:00", 90),
      ]);

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toContain("### Last 7 Days");
      expect(ctx.data_summary).toContain("Pumping: 2 sessions");
      expect(ctx.data_summary).toContain("Feeding: 2 sessions");
    });

    it("should produce complete session log for all historical sessions", async () => {
      await db.sessions.bulkAdd([
        makePump("2025-01-15T08:00:00", 100),
        makePump("2025-01-17T08:00:00", 150),
        makeFeed("2025-01-19T08:00:00", 80),
        makeFeed("2025-01-20T08:00:00", 90),
      ]);

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toContain("### Complete Session Log");
      // Per-day session listings include individual session lines
      expect(ctx.data_summary).toContain("8:00 AM");
      expect(ctx.data_summary).toContain("100 ml");
      expect(ctx.data_summary).toContain("150 ml");
    });

    it("should include sessions from weeks 2-4 in complete session log", async () => {
      await db.sessions.bulkAdd([
        makePump("2025-01-05T08:00:00", 100), // 15 days ago
        makePump("2024-12-25T08:00:00", 120), // 26 days ago
      ]);

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toContain("### Complete Session Log");
      expect(ctx.data_summary).toContain("100 ml");
      expect(ctx.data_summary).toContain("120 ml");
    });

    it("should produce monthly history for sessions older than 30 days", async () => {
      await db.sessions.bulkAdd([
        makePump("2024-12-01T08:00:00", 100),
        makePump("2024-11-15T08:00:00", 200),
        // Also need a recent session to trigger the main code path
        makePump("2025-01-20T08:00:00", 80),
      ]);

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toContain("### Monthly History");
      expect(ctx.data_summary).toContain("2024-12:");
      expect(ctx.data_summary).toContain("2024-11:");
    });

    it("should produce all-time stats section", async () => {
      await db.sessions.bulkAdd([
        makePump("2024-11-01T08:00:00", 200),
        makeFeed("2024-12-15T08:00:00", 150),
        makePump("2025-01-20T08:00:00", 100),
      ]);

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toContain("### All-Time Stats");
      expect(ctx.data_summary).toContain("Total pumped:");
      expect(ctx.data_summary).toContain("Total fed:");
      expect(ctx.data_summary).toContain("Days logged:");
    });
  });

  // --- Unit Conversion ---

  describe("unit conversion", () => {
    it("should format amounts in ml when preferredUnit is ml", async () => {
      await db.sessions.bulkAdd([makePump("2025-01-20T08:00:00", 100)]);

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toContain("Unit: ml");
      expect(ctx.data_summary).toContain("100 ml");
    });

    it("should format amounts in oz when preferredUnit is oz", async () => {
      await db.sessions.bulkAdd([makePump("2025-01-20T08:00:00", 100)]);

      const ctx = await buildChatContext("oz");
      expect(ctx.data_summary).toContain("Unit: oz");
      // 100ml = ~3.4oz
      expect(ctx.data_summary).toContain("3.4 oz");
    });
  });

  // --- Pump/Feed Splitting ---

  describe("pump/feed splitting", () => {
    it("should separate pump and feed session stats to avoid double-counting", async () => {
      await db.sessions.bulkAdd([
        makePump("2025-01-20T08:00:00", 100),
        makePump("2025-01-20T10:00:00", 100),
        makeFeed("2025-01-20T12:00:00", 80),
        makeFeed("2025-01-20T14:00:00", 80),
      ]);

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toContain("Pumping: 2 sessions | Total: 200 ml");
      expect(ctx.data_summary).toContain("Feeding: 2 sessions | Total: 160 ml");
    });

    it("should handle pump-only data without overlap note", async () => {
      await db.sessions.bulkAdd([
        makePump("2025-01-18T08:00:00", 100),
        makePump("2025-01-19T08:00:00", 120),
      ]);

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toContain("Pumping:");
      expect(ctx.data_summary).not.toContain("Feeding:");
      expect(ctx.data_summary).not.toContain("may overlap");
    });

    it("should handle feed-only data without overlap note", async () => {
      await db.sessions.bulkAdd([
        makeFeed("2025-01-18T08:00:00", 80),
        makeFeed("2025-01-19T08:00:00", 90),
      ]);

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toContain("Feeding:");
      expect(ctx.data_summary).not.toContain("Pumping:");
      expect(ctx.data_summary).not.toContain("may overlap");
    });
  });

  // --- Per-Day Detail ---

  describe("per-day session detail", () => {
    it("should list sessions per day with timestamps in complete session log", async () => {
      await db.sessions.bulkAdd([
        makePump("2025-01-19T03:00:00", 80),
        makePump("2025-01-19T09:00:00", 100),
        makePump("2025-01-19T14:00:00", 120),
        makePump("2025-01-19T20:00:00", 90),
      ]);

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toContain("### Complete Session Log");
      expect(ctx.data_summary).toContain("Jan 19 (Sun)");
      expect(ctx.data_summary).toContain("4 pump");
      expect(ctx.data_summary).toContain("3:00 AM");
      expect(ctx.data_summary).toContain("9:00 AM");
      expect(ctx.data_summary).toContain("2:00 PM");
      expect(ctx.data_summary).toContain("8:00 PM");
    });
  });

  // --- 30-Day Supply Trend ---

  describe("30-day supply trend", () => {
    it("should compute increasing pump supply trend", async () => {
      // First half: lower amounts, second half: higher amounts
      const sessions: Session[] = [];
      for (let i = 0; i < 14; i++) {
        const day = 20 - 14 + i; // Jan 6 to Jan 19
        const amount = i < 7 ? 100 : 200; // first half 100, second half 200
        sessions.push(
          makePump(`2025-01-${String(day).padStart(2, "0")}T08:00:00`, amount),
        );
      }
      await db.sessions.bulkAdd(sessions);

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toContain("Trend: increasing");
    });

    it("should compute decreasing pump supply trend", async () => {
      const sessions: Session[] = [];
      for (let i = 0; i < 14; i++) {
        const day = 20 - 14 + i;
        const amount = i < 7 ? 200 : 100; // first half 200, second half 100
        sessions.push(
          makePump(`2025-01-${String(day).padStart(2, "0")}T08:00:00`, amount),
        );
      }
      await db.sessions.bulkAdd(sessions);

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toContain("Trend: decreasing");
    });

    it("should compute stable pump supply trend", async () => {
      const sessions: Session[] = [];
      for (let i = 0; i < 14; i++) {
        const day = 20 - 14 + i;
        sessions.push(
          makePump(`2025-01-${String(day).padStart(2, "0")}T08:00:00`, 150),
        );
      }
      await db.sessions.bulkAdd(sessions);

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toContain("Trend: stable");
    });

    it("should compute consistency metric", async () => {
      // All same amounts = high consistency
      const sessions: Session[] = [];
      for (let i = 0; i < 14; i++) {
        const day = 20 - 14 + i;
        sessions.push(
          makePump(`2025-01-${String(day).padStart(2, "0")}T08:00:00`, 150),
        );
      }
      await db.sessions.bulkAdd(sessions);

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toContain("Consistency: high");
    });

    it("should fall back to feed trend when no pump sessions exist", async () => {
      const sessions: Session[] = [];
      for (let i = 0; i < 10; i++) {
        const day = 20 - 10 + i;
        sessions.push(
          makeFeed(`2025-01-${String(day).padStart(2, "0")}T08:00:00`, 100),
        );
      }
      await db.sessions.bulkAdd(sessions);

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toContain("### 30-Day Feed Trend");
      expect(ctx.data_summary).toContain("Daily avg fed:");
      expect(ctx.data_summary).not.toContain("### 30-Day Supply Trend");
    });
  });

  // --- Thread Summaries ---

  describe("thread summaries", () => {
    it("should include thread summaries from recent conversations", async () => {
      await db.sessions.bulkAdd([makePump("2025-01-20T08:00:00", 100)]);
      await db.chat_threads.bulkAdd([
        { title: "Pump output concern", created_at: new Date("2025-01-18") },
        { title: "Sleep schedule advice", created_at: new Date("2025-01-19") },
      ]);

      const ctx = await buildChatContext("ml");
      expect(ctx.thread_summaries).toBeDefined();
      expect(ctx.thread_summaries).toContain("Pump output concern");
      expect(ctx.thread_summaries).toContain("Sleep schedule advice");
    });

    it("should exclude threads with default title 'New conversation'", async () => {
      await db.sessions.bulkAdd([makePump("2025-01-20T08:00:00", 100)]);
      await db.chat_threads.bulkAdd([
        { title: "New conversation", created_at: new Date("2025-01-18") },
        { title: "Real topic", created_at: new Date("2025-01-19") },
      ]);

      const ctx = await buildChatContext("ml");
      expect(ctx.thread_summaries).toContain("Real topic");
      expect(ctx.thread_summaries).not.toContain("New conversation");
    });

    it("should limit thread summaries to 5 most recent meaningful threads", async () => {
      await db.sessions.bulkAdd([makePump("2025-01-20T08:00:00", 100)]);
      const threads = Array.from({ length: 8 }, (_, i) => ({
        title: `Topic ${i + 1}`,
        created_at: new Date(`2025-01-${String(10 + i).padStart(2, "0")}`),
      }));
      await db.chat_threads.bulkAdd(threads);

      const ctx = await buildChatContext("ml");
      const bulletLines = ctx
        .thread_summaries!.split("\n")
        .filter((l) => l.startsWith("- "));
      expect(bulletLines.length).toBe(5);
    });

    it("should return undefined thread_summaries when no meaningful threads exist", async () => {
      await db.sessions.bulkAdd([makePump("2025-01-20T08:00:00", 100)]);
      await db.chat_threads.bulkAdd([
        { title: "New conversation", created_at: new Date("2025-01-18") },
        { title: "New conversation", created_at: new Date("2025-01-19") },
      ]);

      const ctx = await buildChatContext("ml");
      expect(ctx.thread_summaries).toBeUndefined();
    });
  });

  // --- Character Limits ---

  describe("character limits", () => {
    it("should truncate data_summary to 60000 characters", async () => {
      // Generate lots of sessions to create a long summary
      const sessions: Session[] = [];
      for (let day = 1; day <= 30; day++) {
        for (let hour = 6; hour <= 22; hour += 2) {
          const dateStr = `2025-01-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00`;
          try {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
              sessions.push(
                makePump(dateStr, 100 + hour, {
                  side: "left",
                  duration_min: 15,
                  notes: "Some notes about this pumping session for context",
                }),
              );
            }
          } catch {
            // skip invalid dates
          }
        }
      }
      await db.sessions.bulkAdd(sessions);

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary.length).toBeLessThanOrEqual(60000);
    });

    it("should truncate thread_summaries to 1000 characters", async () => {
      await db.sessions.bulkAdd([makePump("2025-01-20T08:00:00", 100)]);
      // Create threads with long titles
      const threads = Array.from({ length: 10 }, (_, i) => ({
        title: `This is a very long thread title number ${i + 1} that contains a lot of text to push the summary over the character limit for testing purposes and verification`,
        created_at: new Date(`2025-01-${String(10 + i).padStart(2, "0")}`),
      }));
      await db.chat_threads.bulkAdd(threads);

      const ctx = await buildChatContext("ml");
      if (ctx.thread_summaries) {
        expect(ctx.thread_summaries.length).toBeLessThanOrEqual(1000);
      }
    });
  });

  // --- Error Handling ---

  describe("error handling", () => {
    it("should return fallback with session count when inner function throws", async () => {
      await db.sessions.bulkAdd([makePump("2025-01-20T08:00:00", 100)]);

      // Spy on an aggregation function to make it throw
      const aggregation = await import("./aggregation");
      const spy = vi
        .spyOn(aggregation, "computeDailyTotals")
        .mockImplementation(() => {
          throw new Error("Aggregation error");
        });

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toBe("");
      expect(ctx.session_count).toBe(1);

      spy.mockRestore();
    });

    it("should return zero count when both inner function and count query fail", async () => {
      // Mock db.sessions.count to throw
      const countSpy = vi
        .spyOn(db.sessions, "count")
        .mockRejectedValue(new Error("DB error"));
      // Mock db.sessions.where to also throw so inner function fails
      const whereSpy = vi.spyOn(db.sessions, "where").mockImplementation(() => {
        throw new Error("DB error");
      });

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toBe("");
      expect(ctx.session_count).toBe(0);

      countSpy.mockRestore();
      whereSpy.mockRestore();
    });
  });

  // --- Session Detail Formatting ---

  describe("session detail formatting", () => {
    it("should include side, duration, and notes in today session detail", async () => {
      await db.sessions.bulkAdd([
        makePump("2025-01-20T09:00:00", 120, {
          side: "left",
          duration_min: 15,
          notes: "Felt good",
        }),
      ]);

      const ctx = await buildChatContext("ml");
      // Find the session detail line
      const detailLine = ctx.data_summary
        .split("\n")
        .find((l) => l.startsWith("- ") && l.includes("9:00 AM"));
      expect(detailLine).toBeDefined();
      expect(detailLine).toContain("left");
      expect(detailLine).toContain("15min");
      expect(detailLine).toContain('"Felt good"');
    });

    it("should show left/right amounts when available in session detail", async () => {
      await db.sessions.bulkAdd([
        makePump("2025-01-20T09:00:00", 250, {
          side: "both",
          amount_left_ml: 120,
          amount_right_ml: 130,
        }),
      ]);

      const ctx = await buildChatContext("ml");
      const detailLine = ctx.data_summary
        .split("\n")
        .find((l) => l.startsWith("- ") && l.includes("9:00 AM"));
      expect(detailLine).toBeDefined();
      expect(detailLine).toContain("L 120 ml");
      expect(detailLine).toContain("R 130 ml");
      // Should NOT show bare "both" when left/right values are present
      expect(detailLine).not.toContain("| both");
    });

    it("should show only left when right is null", async () => {
      await db.sessions.bulkAdd([
        makePump("2025-01-20T09:00:00", 120, {
          side: "both",
          amount_left_ml: 120,
        }),
      ]);

      const ctx = await buildChatContext("ml");
      const detailLine = ctx.data_summary
        .split("\n")
        .find((l) => l.startsWith("- ") && l.includes("9:00 AM"));
      expect(detailLine).toContain("L 120 ml");
      expect(detailLine).not.toContain("R ");
    });

    it("should fall back to bare side when left/right amounts are null", async () => {
      await db.sessions.bulkAdd([
        makePump("2025-01-20T09:00:00", 120, {
          side: "left",
        }),
      ]);

      const ctx = await buildChatContext("ml");
      const detailLine = ctx.data_summary
        .split("\n")
        .find((l) => l.startsWith("- ") && l.includes("9:00 AM"));
      expect(detailLine).toContain("left");
      expect(detailLine).not.toContain("L ");
    });

    it("should not include side 'unknown' in session detail", async () => {
      await db.sessions.bulkAdd([
        makePump("2025-01-20T09:00:00", 120, { side: "unknown" }),
      ]);

      const ctx = await buildChatContext("ml");
      const detailLine = ctx.data_summary
        .split("\n")
        .find((l) => l.startsWith("- ") && l.includes("9:00 AM"));
      expect(detailLine).toBeDefined();
      expect(detailLine).not.toContain("unknown");
    });

    it("should truncate notes to 80 characters in session detail", async () => {
      const longNotes = "A".repeat(120);
      await db.sessions.bulkAdd([
        makePump("2025-01-20T09:00:00", 120, { notes: longNotes }),
      ]);

      const ctx = await buildChatContext("ml");
      const detailLine = ctx.data_summary
        .split("\n")
        .find((l) => l.startsWith("- ") && l.includes("9:00 AM"));
      expect(detailLine).toBeDefined();
      // Should contain 80 A's but not 120
      expect(detailLine).toContain('"' + "A".repeat(80) + '"');
      expect(detailLine).not.toContain("A".repeat(81));
    });
  });

  // --- Header Accuracy ---

  describe("header accuracy", () => {
    it("should include correct date range from first to last session", async () => {
      await db.sessions.bulkAdd([
        makePump("2024-11-01T08:00:00", 100),
        makePump("2025-01-20T08:00:00", 120),
      ]);

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toContain("Nov 1, 2024");
      expect(ctx.data_summary).toContain("Jan 20, 2025");
    });

    it("should include total session count in header", async () => {
      await db.sessions.bulkAdd([
        makePump("2025-01-18T08:00:00", 100),
        makePump("2025-01-19T08:00:00", 120),
        makePump("2025-01-20T08:00:00", 80),
      ]);

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toContain("Total: 3 sessions");
    });
  });

  // --- Duration and Side Stats ---

  describe("duration and side stats", () => {
    it("should include duration in per-session detail when sessions have duration_min", async () => {
      await db.sessions.bulkAdd([
        makePump("2025-01-18T08:00:00", 100, { duration_min: 10 }),
        makePump("2025-01-18T12:00:00", 120, { duration_min: 20 }),
      ]);

      const ctx = await buildChatContext("ml");
      // Duration now appears in individual session lines
      expect(ctx.data_summary).toContain("10min");
      expect(ctx.data_summary).toContain("20min");
    });

    it("should include side in per-session detail for 7-day sessions", async () => {
      await db.sessions.bulkAdd([
        makePump("2025-01-18T08:00:00", 100, { side: "left" }),
        makePump("2025-01-18T12:00:00", 80, { side: "left" }),
        makePump("2025-01-19T08:00:00", 120, { side: "right" }),
      ]);

      const ctx = await buildChatContext("ml");
      // Side info now appears in individual session lines
      expect(ctx.data_summary).toContain("left");
      expect(ctx.data_summary).toContain("right");
    });

    it("should include regularity stats in 7-day section", async () => {
      await db.sessions.bulkAdd([
        makePump("2025-01-19T06:00:00", 100),
        makePump("2025-01-19T09:00:00", 100), // 3h gap
        makePump("2025-01-19T12:00:00", 100), // 3h gap
        makePump("2025-01-19T15:00:00", 100), // 3h gap
      ]);

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toContain("Regularity: avg 3h between sessions");
    });
  });

  // --- Month-over-Month Supply Trend ---

  describe("all-time supply trend", () => {
    it("should compute month-over-month pump supply change percentage", async () => {
      // Nov: pump 100/day for 5 days, Jan: pump 200/day for 5 days
      const sessions: Session[] = [];
      for (let d = 1; d <= 5; d++) {
        sessions.push(
          makePump(`2024-11-${String(d).padStart(2, "0")}T08:00:00`, 100),
        );
        sessions.push(
          makePump(`2025-01-${String(d).padStart(2, "0")}T08:00:00`, 200),
        );
      }
      await db.sessions.bulkAdd(sessions);

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toContain("Pump supply trend since start:");
      expect(ctx.data_summary).toContain("+100.0%");
    });
  });

  // --- No sessions in recent windows ---

  describe("sparse data windows", () => {
    it("should show 'No sessions logged today yet' when today is empty", async () => {
      await db.sessions.bulkAdd([makePump("2025-01-18T08:00:00", 100)]);

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toContain("No sessions logged today yet.");
    });

    it("should show 'No sessions in the last 7 days' when 7d window is empty", async () => {
      // Only old sessions outside 7-day window
      await db.sessions.bulkAdd([makePump("2025-01-05T08:00:00", 100)]);

      const ctx = await buildChatContext("ml");
      expect(ctx.data_summary).toContain("No sessions in the last 7 days.");
    });
  });
});
