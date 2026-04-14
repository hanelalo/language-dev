import { describe, expect, it } from "vitest";
import { renderTranslationBlock } from "../../src/content/translation-renderer";
import type { Segment } from "../../src/content/dom-extractor";

describe("renderTranslationBlock", () => {
  it("renders translated text directly below source", () => {
    document.body.innerHTML = "<p>Hello</p>";
    const p = document.querySelector("p")!;
    const segment: Segment = { segmentId: "seg-0", text: "Hello", xpath: "/html/body/p[1]", order: 0, element: p };

    renderTranslationBlock(segment, "插件可用。", "done");

    const wrapper = document.querySelector(".wpt-segment");
    expect(wrapper).toBeTruthy();
    expect(wrapper?.textContent).toContain("插件可用。");
  });

  it("handles failed status", () => {
    document.body.innerHTML = "<p>Hello</p>";
    const p = document.querySelector("p")!;
    const segment: Segment = { segmentId: "seg-0", text: "Hello", xpath: "/html/body/p[1]", order: 0, element: p };

    renderTranslationBlock(segment, "", "failed");

    const wrapper = document.querySelector(".wpt-segment");
    expect(wrapper?.textContent).toContain("[翻译失败]");
  });
});
