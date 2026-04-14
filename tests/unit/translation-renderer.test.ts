import { describe, expect, it } from "vitest";
import { renderTranslationBlock } from "../../src/content/translation-renderer";

describe("renderTranslationBlock", () => {
  it("renders translated text directly below source", () => {
    const html = renderTranslationBlock("The plugin works.", "插件可用。", "done");
    expect(html).toContain("插件可用。");
    expect(html).toContain("border-left");
  });
});