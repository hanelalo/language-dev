import { describe, expect, it } from "vitest";
import { renderTranslationBlock } from "../../src/content/translation-renderer";

describe("renderTranslationBlock", () => {
  it("renders translated text directly below source", () => {
    const html = renderTranslationBlock("The plugin works.", "插件可用。", "done");
    expect(html).toContain("插件可用。");
    expect(html).toContain("border-left");
  });

  it("escapes HTML characters in source and translated", () => {
    const html = renderTranslationBlock("<script>alert(1)</script>", "Hello & \"World\"", "done");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
    expect(html).toContain("&quot;World&quot;");
  });
});