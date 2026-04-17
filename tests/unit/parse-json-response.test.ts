import { describe, expect, it } from "vitest";
import { parseTranslationArray } from "../../src/background/parse-json-response";

describe("parseTranslationArray", () => {
  it("parses clean JSON array", () => {
    const result = parseTranslationArray('["你好", "世界"]', 2);
    expect(result).toEqual({ ok: true, items: ["你好", "世界"] });
  });

  it("extracts JSON from markdown code block", () => {
    const raw = '```json\n["你好", "世界"]\n```';
    const result = parseTranslationArray(raw, 2);
    expect(result).toEqual({ ok: true, items: ["你好", "世界"] });
  });

  it("extracts JSON from plain code block", () => {
    const raw = '```\n["你好", "世界"]\n```';
    const result = parseTranslationArray(raw, 2);
    expect(result).toEqual({ ok: true, items: ["你好", "世界"] });
  });

  it("extracts JSON embedded in surrounding text by finding brackets", () => {
    const raw = 'Here is the translation:\n["你好", "世界"]\nDone.';
    const result = parseTranslationArray(raw, 2);
    expect(result).toEqual({ ok: true, items: ["你好", "世界"] });
  });

  it("fails when array length does not match expectedCount", () => {
    const result = parseTranslationArray('["你好"]', 2);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("length");
    }
  });

  it("fails when result is not an array", () => {
    const result = parseTranslationArray('{"1": "你好"}', 1);
    expect(result.ok).toBe(false);
  });

  it("fails when array contains non-strings", () => {
    const result = parseTranslationArray('[1, 2]', 2);
    expect(result.ok).toBe(false);
  });

  it("fails when array contains empty strings", () => {
    const result = parseTranslationArray('["你好", ""]', 2);
    expect(result.ok).toBe(false);
  });

  it("fails on completely invalid JSON", () => {
    const result = parseTranslationArray("not json at all", 1);
    expect(result.ok).toBe(false);
  });

  it("returns partial items when available on failure", () => {
    const result = parseTranslationArray('["你好"]', 3);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.partial).toEqual(["你好"]);
    }
  });

  it("handles single-element array", () => {
    const result = parseTranslationArray('["你好"]', 1);
    expect(result).toEqual({ ok: true, items: ["你好"] });
  });
});
