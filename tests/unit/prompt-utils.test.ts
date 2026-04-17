import { describe, expect, it } from "vitest";
import { buildBatchUserPrompt } from "../../src/background/engines/prompt-utils";

describe("buildBatchUserPrompt", () => {
  it("includes source and target language", () => {
    const result = buildBatchUserPrompt(["hello"], "en", "zh-CN");
    expect(result).toContain("en");
    expect(result).toContain("zh-CN");
  });

  it("includes all input texts numbered", () => {
    const result = buildBatchUserPrompt(["hello", "world", "foo"], "en", "zh-CN");
    expect(result).toContain("1. hello");
    expect(result).toContain("2. world");
    expect(result).toContain("3. foo");
  });

  it("states exact count requirement", () => {
    const result = buildBatchUserPrompt(["a", "b"], "en", "zh-CN");
    expect(result).toContain("exactly 2");
  });

  it("includes example format", () => {
    const result = buildBatchUserPrompt(["hello"], "en", "zh-CN");
    expect(result).toContain('["');
  });

  it("emphasizes JSON-only output", () => {
    const result = buildBatchUserPrompt(["hello"], "en", "zh-CN");
    expect(result).toContain("ONLY");
    expect(result).toContain("No explanation");
  });

  it("handles empty texts array", () => {
    const result = buildBatchUserPrompt([], "en", "zh-CN");
    expect(result).toContain("exactly 0");
  });

  it("handles texts with special characters", () => {
    const result = buildBatchUserPrompt(["hello \"world\"", "line\nbreak"], "en", "zh-CN");
    expect(result).toContain("1. hello \"world\"");
    expect(result).toContain("2. line\nbreak");
  });
});
