import { describe, expect, it } from "vitest";
import { buildBatchUserPrompt } from "../../src/background/engines/prompt-utils";

describe("buildBatchUserPrompt", () => {
  it("includes source and target language", () => {
    const result = buildBatchUserPrompt(["hello"], "en", "zh-CN");
    expect(result).toContain("en");
    expect(result).toContain("zh-CN");
  });

  it("includes input as JSON array of objects", () => {
    const result = buildBatchUserPrompt(["hello", "world", "foo"], "en", "zh-CN");
    expect(result).toContain('"index":1');
    expect(result).toContain('"text":"hello"');
    expect(result).toContain('"index":2');
    expect(result).toContain('"text":"world"');
    expect(result).toContain('"index":3');
    expect(result).toContain('"text":"foo"');
  });

  it("states exact count requirement", () => {
    const result = buildBatchUserPrompt(["a", "b"], "en", "zh-CN");
    expect(result).toContain("exactly 2");
  });

  it("includes example format with index and text fields", () => {
    const result = buildBatchUserPrompt(["hello"], "en", "zh-CN");
    expect(result).toContain('"index"');
    expect(result).toContain('"text"');
  });

  it("emphasizes JSON-only output", () => {
    const result = buildBatchUserPrompt(["hello"], "en", "zh-CN");
    expect(result).toContain("ONLY");
    expect(result).toContain("No explanation");
  });

  it("instructs to keep index unchanged and translate only text", () => {
    const result = buildBatchUserPrompt(["hello"], "en", "zh-CN");
    expect(result).toContain("index");
    expect(result).toContain("unchanged");
  });

  it("handles empty texts array", () => {
    const result = buildBatchUserPrompt([], "en", "zh-CN");
    expect(result).toContain("exactly 0");
  });

  it("handles texts with special characters via JSON encoding", () => {
    const result = buildBatchUserPrompt(["hello \"world\"", "line\nbreak"], "en", "zh-CN");
    // The Input section is a single JSON line between "Input:\n" and "\n\nOutput:"
    const inputSection = result.split("Input:\n")[1].split("\n\n")[0];
    const parsed = JSON.parse(inputSection.trim());
    expect(parsed[0].text).toBe("hello \"world\"");
    expect(parsed[1].text).toBe("line\nbreak");
  });
});
