import { describe, expect, it } from "vitest";
import { parseTranslationArray } from "../../src/background/parse-json-response";

describe("parseTranslationArray", () => {
  describe("object format (primary)", () => {
    it("parses clean JSON object array", () => {
      const result = parseTranslationArray('[{"index":1,"text":"你好"},{"index":2,"text":"世界"}]', 2);
      expect(result).toEqual({ ok: true, items: ["你好", "世界"] });
    });

    it("sorts by index when out of order", () => {
      const result = parseTranslationArray('[{"index":2,"text":"世界"},{"index":1,"text":"你好"}]', 2);
      expect(result).toEqual({ ok: true, items: ["你好", "世界"] });
    });

    it("extracts JSON from markdown code block", () => {
      const raw = '```json\n[{"index":1,"text":"你好"},{"index":2,"text":"世界"}]\n```';
      const result = parseTranslationArray(raw, 2);
      expect(result).toEqual({ ok: true, items: ["你好", "世界"] });
    });

    it("extracts JSON from plain code block", () => {
      const raw = '```\n[{"index":1,"text":"你好"},{"index":2,"text":"世界"}]\n```';
      const result = parseTranslationArray(raw, 2);
      expect(result).toEqual({ ok: true, items: ["你好", "世界"] });
    });

    it("extracts JSON embedded in surrounding text by finding brackets", () => {
      const raw = 'Here is the translation:\n[{"index":1,"text":"你好"},{"index":2,"text":"世界"}]\nDone.';
      const result = parseTranslationArray(raw, 2);
      expect(result).toEqual({ ok: true, items: ["你好", "世界"] });
    });

    it("fails when object array length does not match expectedCount", () => {
      const result = parseTranslationArray('[{"index":1,"text":"你好"}]', 2);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Expected 2 items, got 1");
        expect(result.partial).toEqual(["你好"]);
      }
    });

    it("fails when object has invalid index type", () => {
      const result = parseTranslationArray('[{"index":"1","text":"你好"}]', 1);
      expect(result.ok).toBe(false);
    });

    it("fails when object has empty text", () => {
      const result = parseTranslationArray('[{"index":1,"text":""}]', 1);
      expect(result.ok).toBe(false);
    });

    it("fails when object is missing required fields", () => {
      const result = parseTranslationArray('[{"index":1}]', 1);
      expect(result.ok).toBe(false);
    });

    it("handles single-element object array", () => {
      const result = parseTranslationArray('[{"index":1,"text":"你好"}]', 1);
      expect(result).toEqual({ ok: true, items: ["你好"] });
    });

    it("returns partial items when some objects are invalid", () => {
      const result = parseTranslationArray('[{"index":1,"text":"你好"},{"index":"bad"}]', 3);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.partial).toEqual(["你好"]);
      }
    });
  });

  describe("string array format (fallback)", () => {
    it("parses clean JSON string array", () => {
      const result = parseTranslationArray('["你好", "世界"]', 2);
      expect(result).toEqual({ ok: true, items: ["你好", "世界"] });
    });

    it("fails when string array length mismatches", () => {
      const result = parseTranslationArray('["你好"]', 2);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("length");
      }
    });

    it("fails when array contains non-strings", () => {
      const result = parseTranslationArray('[1, 2]', 2);
      expect(result.ok).toBe(false);
    });

    it("fails when array contains empty strings", () => {
      const result = parseTranslationArray('["你好", ""]', 2);
      expect(result.ok).toBe(false);
    });

    it("returns partial items when available on failure", () => {
      const result = parseTranslationArray('["你好"]', 3);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.partial).toEqual(["你好"]);
      }
    });
  });

  describe("common", () => {
    it("fails when result is not an array", () => {
      const result = parseTranslationArray('{"1": "你好"}', 1);
      expect(result.ok).toBe(false);
    });

    it("fails on completely invalid JSON", () => {
      const result = parseTranslationArray("not json at all", 1);
      expect(result.ok).toBe(false);
    });
  });
});
