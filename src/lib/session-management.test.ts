import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import { deleteImportedSessions, countSessionsBySource, deleteImportsAfterDate } from "./session-management";
import type { Session } from "@/types/session";

describe("session-management", () => {
  beforeEach(async () => {
    await db.sessions.clear();
  });

  describe("countSessionsBySource", () => {
    it("should count sessions by source type", async () => {
      const now = new Date();

      await db.sessions.bulkAdd([
        {
          timestamp: now,
          amount_ml: 120,
          session_type: "feeding",
          source: "manual",
          confidence: 1.0,
          created_at: now,
          updated_at: now,
        },
        {
          timestamp: now,
          amount_ml: 150,
          session_type: "feeding",
          source: "imported",
          confidence: 1.0,
          created_at: now,
          updated_at: now,
        },
        {
          timestamp: now,
          amount_ml: 100,
          session_type: "pumping",
          source: "ocr",
          confidence: 0.95,
          created_at: now,
          updated_at: now,
        },
        {
          timestamp: now,
          amount_ml: 180,
          session_type: "feeding",
          source: "ai_vision",
          confidence: 0.9,
          created_at: now,
          updated_at: now,
        },
        {
          timestamp: now,
          amount_ml: 130,
          session_type: "feeding",
          source: "manual",
          confidence: 1.0,
          created_at: now,
          updated_at: now,
        },
      ] as Session[]);

      const counts = await countSessionsBySource();

      expect(counts.manual).toBe(2);
      expect(counts.imported).toBe(1);
      expect(counts.ocr).toBe(1);
      expect(counts.ai_vision).toBe(1);
    });

    it("should handle empty database", async () => {
      const counts = await countSessionsBySource();

      expect(counts.manual).toBe(0);
      expect(counts.imported).toBe(0);
      expect(counts.ocr).toBe(0);
      expect(counts.ai_vision).toBe(0);
    });
  });

  describe("deleteImportedSessions", () => {
    it("should delete all imported sessions by default", async () => {
      const now = new Date();

      await db.sessions.bulkAdd([
        {
          timestamp: now,
          amount_ml: 120,
          session_type: "feeding",
          source: "manual",
          confidence: 1.0,
          created_at: now,
          updated_at: now,
        },
        {
          timestamp: now,
          amount_ml: 150,
          session_type: "feeding",
          source: "imported",
          confidence: 1.0,
          created_at: now,
          updated_at: now,
        },
        {
          timestamp: now,
          amount_ml: 100,
          session_type: "pumping",
          source: "ocr",
          confidence: 0.95,
          created_at: now,
          updated_at: now,
        },
        {
          timestamp: now,
          amount_ml: 180,
          session_type: "feeding",
          source: "ai_vision",
          confidence: 0.9,
          created_at: now,
          updated_at: now,
        },
      ] as Session[]);

      const result = await deleteImportedSessions();

      expect(result.deleted).toBe(3); // imported, ocr, ai_vision
      expect(result.sources).toEqual(["imported", "ocr", "ai_vision"]);

      const remaining = await db.sessions.toArray();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].source).toBe("manual");
    });

    it("should delete only specified sources", async () => {
      const now = new Date();

      await db.sessions.bulkAdd([
        {
          timestamp: now,
          amount_ml: 150,
          session_type: "feeding",
          source: "imported",
          confidence: 1.0,
          created_at: now,
          updated_at: now,
        },
        {
          timestamp: now,
          amount_ml: 100,
          session_type: "pumping",
          source: "ocr",
          confidence: 0.95,
          created_at: now,
          updated_at: now,
        },
        {
          timestamp: now,
          amount_ml: 180,
          session_type: "feeding",
          source: "ai_vision",
          confidence: 0.9,
          created_at: now,
          updated_at: now,
        },
      ] as Session[]);

      const result = await deleteImportedSessions(["imported"]);

      expect(result.deleted).toBe(1);
      expect(result.sources).toEqual(["imported"]);

      const remaining = await db.sessions.toArray();
      expect(remaining).toHaveLength(2);
      expect(remaining.every(s => s.source !== "imported")).toBe(true);
    });

    it("should return 0 deleted when no imported sessions exist", async () => {
      const now = new Date();

      await db.sessions.add({
        timestamp: now,
        amount_ml: 120,
        session_type: "feeding",
        source: "manual",
        confidence: 1.0,
        created_at: now,
        updated_at: now,
      } as Session);

      const result = await deleteImportedSessions();

      expect(result.deleted).toBe(0);

      const remaining = await db.sessions.toArray();
      expect(remaining).toHaveLength(1);
    });
  });

  describe("deleteImportsAfterDate", () => {
    it("should delete only imports created after specified date", async () => {
      const oldDate = new Date("2024-01-01");
      const newDate = new Date("2024-02-01");
      const cutoffDate = new Date("2024-01-15");

      await db.sessions.bulkAdd([
        {
          timestamp: oldDate,
          amount_ml: 150,
          session_type: "feeding",
          source: "imported",
          confidence: 1.0,
          created_at: oldDate,
          updated_at: oldDate,
        },
        {
          timestamp: newDate,
          amount_ml: 100,
          session_type: "pumping",
          source: "imported",
          confidence: 1.0,
          created_at: newDate,
          updated_at: newDate,
        },
        {
          timestamp: newDate,
          amount_ml: 180,
          session_type: "feeding",
          source: "manual",
          confidence: 1.0,
          created_at: newDate,
          updated_at: newDate,
        },
      ] as Session[]);

      // Use new consolidated API with afterDate parameter
      const result = await deleteImportedSessions(["imported", "ocr", "ai_vision"], cutoffDate);

      expect(result.deleted).toBe(1); // Only the imported session from Feb 1

      const remaining = await db.sessions.toArray();
      expect(remaining).toHaveLength(2);
      expect(remaining.find(s => s.source === "imported")?.created_at).toEqual(oldDate);
    });

    it("should not delete manual sessions even if created after date", async () => {
      const newDate = new Date("2024-02-01");
      const cutoffDate = new Date("2024-01-15");

      await db.sessions.bulkAdd([
        {
          timestamp: newDate,
          amount_ml: 150,
          session_type: "feeding",
          source: "manual",
          confidence: 1.0,
          created_at: newDate,
          updated_at: newDate,
        },
        {
          timestamp: newDate,
          amount_ml: 100,
          session_type: "pumping",
          source: "imported",
          confidence: 1.0,
          created_at: newDate,
          updated_at: newDate,
        },
      ] as Session[]);

      const result = await deleteImportedSessions(["imported", "ocr", "ai_vision"], cutoffDate);

      expect(result.deleted).toBe(1);

      const remaining = await db.sessions.toArray();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].source).toBe("manual");
    });

    it("should maintain backward compatibility with deprecated deleteImportsAfterDate", async () => {
      const newDate = new Date("2024-02-01");
      const cutoffDate = new Date("2024-01-15");

      await db.sessions.add({
        timestamp: newDate,
        amount_ml: 100,
        session_type: "pumping",
        source: "imported",
        confidence: 1.0,
        created_at: newDate,
        updated_at: newDate,
      } as Session);

      const result = await deleteImportsAfterDate(cutoffDate);

      expect(result.deleted).toBe(1);
    });
  });
});
