import { describe, expect, it } from "vitest";
import { buildSelectionTooltip } from "../../src/content/selection-translate";

describe("buildSelectionTooltip", () => {
  it("includes translated text", () => {
    const html = buildSelectionTooltip("hello", "你好");
    expect(html).toContain("你好");
  });
});
