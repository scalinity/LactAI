import { describe, it, expect } from "vitest";
import {
  getChatSystemPrompt,
  getVisionSystemPrompt,
  getInsightsSystemPrompt,
} from "./prompts";

describe("getChatSystemPrompt", () => {
  // --- No Context ---

  describe("no context", () => {
    it("should return base prompt when called with no context", () => {
      const prompt = getChatSystemPrompt();
      expect(prompt).toContain("lactation support");
      expect(prompt).toContain("ClaudiaFlow");
      expect(prompt).toContain("RED FLAG");
      expect(prompt).toContain("BOUNDARIES");
      expect(prompt).not.toContain("USER DATA:");
      expect(prompt).not.toContain("CONVERSATION MEMORY:");
    });

    it("should default unit to ml when no preferred_unit provided", () => {
      const prompt = getChatSystemPrompt();
      expect(prompt).toContain("Always use ml as the unit");
    });
  });

  // --- Baby Age Context ---

  describe("baby age", () => {
    it("should include baby age in weeks and months when provided", () => {
      const prompt = getChatSystemPrompt({ baby_age_weeks: 26 });
      expect(prompt).toContain("approximately 26 weeks old");
      expect(prompt).toContain("6 months");
    });

    it("should not include age section when baby_age_weeks is undefined", () => {
      const prompt = getChatSystemPrompt({});
      expect(prompt).not.toContain("weeks old");
    });

    it("should handle age rounding for months correctly", () => {
      // 1 week = 0 months
      const prompt1 = getChatSystemPrompt({ baby_age_weeks: 1 });
      expect(prompt1).toContain("1 weeks old (0 months)");

      // 52 weeks = 12 months
      const prompt52 = getChatSystemPrompt({ baby_age_weeks: 52 });
      expect(prompt52).toContain("52 weeks old (12 months)");
    });
  });

  // --- Expression Method ---

  describe("expression method", () => {
    it("should include expression method when provided", () => {
      const prompt = getChatSystemPrompt({ expression_method: "pump" });
      expect(prompt).toContain("primarily uses pump expression");
    });

    it("should not include method section when expression_method is undefined", () => {
      const prompt = getChatSystemPrompt({});
      expect(prompt).not.toContain("primarily uses");
    });
  });

  // --- Unit Preference ---

  describe("unit preference", () => {
    it("should use oz as unit when preferred_unit is oz", () => {
      const prompt = getChatSystemPrompt({ preferred_unit: "oz" });
      expect(prompt).toContain("Always use oz as the unit");
    });

    it("should use ml as unit when preferred_unit is ml", () => {
      const prompt = getChatSystemPrompt({ preferred_unit: "ml" });
      expect(prompt).toContain("Always use ml as the unit");
    });
  });

  // --- Data Summary Injection ---

  describe("data summary injection", () => {
    it("should include full USER DATA section when data_summary is provided", () => {
      const prompt = getChatSystemPrompt({
        data_summary: "## Data Summary\nPumping: 5 sessions",
      });
      expect(prompt).toContain("USER DATA:");
      expect(prompt).toContain("personalized, data-driven");
      expect(prompt).toContain("## Data Summary\nPumping: 5 sessions");
      expect(prompt).toContain("DATA RULES:");
    });

    it("should include placeholder prohibition in DATA RULES", () => {
      const prompt = getChatSystemPrompt({ data_summary: "test data" });
      expect(prompt).toContain("NEVER use bracket placeholders");
    });

    it("should include zero-sessions message when session_count is 0 and no data_summary", () => {
      const prompt = getChatSystemPrompt({ session_count: 0 });
      expect(prompt).toContain("no session data recorded yet");
      expect(prompt).toContain("start logging sessions");
    });

    it("should include data-unavailable message when session_count > 0 but no data_summary", () => {
      const prompt = getChatSystemPrompt({ session_count: 42 });
      expect(prompt).toContain("42 sessions logged");
      expect(prompt).toContain("could not be loaded");
      expect(prompt).toContain("Do NOT make up numbers");
    });

    it("should include no data section when context is empty", () => {
      const prompt = getChatSystemPrompt({});
      expect(prompt).not.toContain("USER DATA:");
      expect(prompt).not.toContain("no session data recorded yet");
      expect(prompt).not.toContain("sessions logged");
    });
  });

  // --- Thread Summaries ---

  describe("thread summaries", () => {
    it("should include CONVERSATION MEMORY section when thread_summaries provided", () => {
      const prompt = getChatSystemPrompt({
        thread_summaries:
          '- "Pump concern" (Jan 5)\n- "Sleep schedule" (Jan 3)',
      });
      expect(prompt).toContain("CONVERSATION MEMORY:");
      expect(prompt).toContain("Pump concern");
      expect(prompt).toContain("Sleep schedule");
    });

    it("should not include CONVERSATION MEMORY when thread_summaries is undefined", () => {
      const prompt = getChatSystemPrompt({});
      expect(prompt).not.toContain("CONVERSATION MEMORY:");
    });
  });

  // --- Full Context Integration ---

  describe("full context integration", () => {
    it("should compose all sections correctly with full context", () => {
      const prompt = getChatSystemPrompt({
        baby_age_weeks: 12,
        expression_method: "both",
        data_summary: "## Data\nTotal: 50 sessions",
        session_count: 50,
        preferred_unit: "oz",
        thread_summaries: '- "Topic A" (Jan 1)',
      });

      // All sections present
      expect(prompt).toContain("12 weeks old");
      expect(prompt).toContain("primarily uses both expression");
      expect(prompt).toContain("Always use oz as the unit");
      expect(prompt).toContain("USER DATA:");
      expect(prompt).toContain("## Data\nTotal: 50 sessions");
      expect(prompt).toContain("CONVERSATION MEMORY:");
      expect(prompt).toContain("Topic A");

      // Safety sections always present
      expect(prompt).toContain("RED FLAG");
      expect(prompt).toContain("BOUNDARIES");
    });
  });

  // --- Safety Sections ---

  describe("safety sections", () => {
    it("should always include red flag guidance regardless of context", () => {
      const withoutContext = getChatSystemPrompt();
      const withContext = getChatSystemPrompt({ data_summary: "data" });

      for (const prompt of [withoutContext, withContext]) {
        expect(prompt).toContain("RED FLAG");
        expect(prompt).toContain("fever");
        expect(prompt).toContain("doctor");
      }
    });

    it("should always include BOUNDARIES section", () => {
      const prompt = getChatSystemPrompt();
      expect(prompt).toContain("BOUNDARIES");
      expect(prompt).toContain("diagnose");
      expect(prompt).toContain("medications");
    });
  });

  // --- Data summary takes precedence over session_count ---

  describe("data precedence", () => {
    it("should use data_summary when both data_summary and session_count are provided", () => {
      const prompt = getChatSystemPrompt({
        data_summary: "Real data here",
        session_count: 42,
      });
      expect(prompt).toContain("USER DATA:");
      expect(prompt).toContain("Real data here");
      expect(prompt).not.toContain(
        "42 sessions logged, but detailed data could not be loaded",
      );
    });
  });
});

describe("getVisionSystemPrompt", () => {
  it("should return extraction prompt with default unit when no context", () => {
    const prompt = getVisionSystemPrompt();
    expect(prompt).toContain("data extraction assistant");
    expect(prompt).toContain("Default to ml");
    expect(prompt).toContain("REQUIRED OUTPUT SCHEMA");
  });

  it("should include preferred unit hint when provided", () => {
    const prompt = getVisionSystemPrompt({ preferred_unit: "oz" });
    expect(prompt).toContain('prefers "oz"');
  });

  it("should include date hint when provided", () => {
    const prompt = getVisionSystemPrompt({ date_hint: "2025-01-20" });
    expect(prompt).toContain("near 2025-01-20");
  });

  it("should include timezone hint when provided", () => {
    const prompt = getVisionSystemPrompt({ timezone: "America/Chicago" });
    expect(prompt).toContain("America/Chicago");
  });
});

describe("getInsightsSystemPrompt", () => {
  it("should return analysis prompt with JSON schema", () => {
    const prompt = getInsightsSystemPrompt();
    expect(prompt).toContain("data analyst");
    expect(prompt).toContain("OUTPUT FORMAT");
    expect(prompt).toContain("daily_volume");
    expect(prompt).toContain("session_average");
    expect(prompt).toContain("session_type");
    expect(prompt).toContain("duration_min");
    expect(prompt).toContain("side_balance");
    expect(prompt).toContain("tips");
  });
});
