import { describe, it, expect } from "vitest";
import {
  PROMPT_STARTERS,
  CATEGORY_META,
  getRandomStarters,
  type PromptCategory,
} from "./prompt-starters";

describe("prompt-starters data", () => {
  it("should have at least one prompt per category", () => {
    const categories = Object.keys(CATEGORY_META) as PromptCategory[];
    for (const cat of categories) {
      const prompts = PROMPT_STARTERS.filter((p) => p.category === cat);
      expect(prompts.length).toBeGreaterThan(0);
    }
  });

  it("should have unique ids", () => {
    const ids = PROMPT_STARTERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have non-empty shortLabel and fullPrompt for each starter", () => {
    for (const p of PROMPT_STARTERS) {
      expect(p.shortLabel.length).toBeGreaterThan(0);
      expect(p.fullPrompt.length).toBeGreaterThan(0);
    }
  });

  it("every prompt category should be in CATEGORY_META", () => {
    for (const p of PROMPT_STARTERS) {
      expect(CATEGORY_META).toHaveProperty(p.category);
    }
  });
});

describe("getRandomStarters", () => {
  it("should return requested count", () => {
    const result = getRandomStarters(5);
    expect(result.length).toBe(5);
  });

  it("should return fewer when not enough available", () => {
    // Exclude all but 2
    const excludeIds = PROMPT_STARTERS.slice(2).map((p) => p.id);
    const result = getRandomStarters(5, excludeIds);
    expect(result.length).toBe(2);
  });

  it("should exclude specified ids", () => {
    const excludeIds = PROMPT_STARTERS.slice(0, 3).map((p) => p.id);
    const result = getRandomStarters(5, excludeIds);
    for (const r of result) {
      expect(excludeIds).not.toContain(r.id);
    }
  });

  it("should include prompts from multiple categories", () => {
    const result = getRandomStarters(4);
    const categories = new Set(result.map((p) => p.category));
    // With 4 categories and picking one from each, we should get at least 3
    expect(categories.size).toBeGreaterThanOrEqual(3);
  });

  it("should return empty array when all prompts are excluded", () => {
    const allIds = PROMPT_STARTERS.map((p) => p.id);
    const result = getRandomStarters(5, allIds);
    expect(result).toEqual([]);
  });
});
