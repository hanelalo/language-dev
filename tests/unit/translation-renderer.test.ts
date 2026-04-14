import { beforeEach, describe, expect, it } from "vitest";
import {
  renderTranslationBlock,
  setTranslationVisibility,
  toggleTranslationVisibility,
  updateSegmentStatus
} from "../../src/content/translation-renderer";
import type { Segment } from "../../src/content/dom-extractor";

describe("renderTranslationBlock", () => {
  beforeEach(() => {
    setTranslationVisibility(false);
  });

  it("appends translated block under source element for append mode", () => {
    document.body.innerHTML = "<p>Hello</p>";
    const p = document.querySelector("p")!;
    const segment: Segment = {
      segmentId: "seg-0",
      text: "Hello",
      xpath: "/html/body/p[1]",
      order: 0,
      element: p,
      renderMode: "append"
    };

    renderTranslationBlock(segment, "插件可用。", "done");

    const translated = document.querySelector('[data-wpt-id="seg-0"]') as HTMLElement;
    expect(translated).toBeTruthy();
    expect(translated.style.display).toBe("none");
    expect(translated.textContent).toBe("插件可用。");
    expect(p.textContent).toBe("Hello");

    setTranslationVisibility(true);
    expect(translated.style.display).toBe("");

    setTranslationVisibility(false);
    expect(translated.style.display).toBe("none");
  });

  it("copies typography styles from source element in append mode", () => {
    document.body.innerHTML = '<h1 style="font-size: 52px; font-weight: 700; color: rgb(12, 34, 56);">Hello</h1>';
    const h1 = document.querySelector("h1")!;
    const segment: Segment = {
      segmentId: "seg-typo",
      text: "Hello",
      xpath: "/html/body/h1[1]",
      order: 0,
      element: h1,
      renderMode: "append"
    };

    renderTranslationBlock(segment, "你好", "done");
    setTranslationVisibility(true);

    const translated = document.querySelector('[data-wpt-id="seg-typo"]') as HTMLElement;
    expect(translated.style.fontSize).toBe("52px");
    expect(translated.style.fontWeight).toBe("700");
    expect(translated.style.color).toBe("rgb(12, 34, 56)");
  });

  it("replaces text node in replace mode", () => {
    document.body.innerHTML = "<button>Hello</button>";
    const button = document.querySelector("button")!;
    const textNode = button.firstChild as Text;
    const segment: Segment = {
      segmentId: "seg-1",
      text: "Hello",
      xpath: "/html/body/button[1]/text()[1]",
      order: 0,
      element: button,
      node: textNode,
      renderMode: "replace"
    };

    renderTranslationBlock(segment, "翻译中...", "pending");
    updateSegmentStatus(segment.segmentId, "done", "已翻译");

    expect(document.querySelector('[data-wpt-id="seg-1"]')).toBeNull();
    expect(button.textContent).toBe("Hello");

    setTranslationVisibility(true);
    expect(button.textContent).toBe("已翻译");

    toggleTranslationVisibility();
    expect(button.textContent).toBe("Hello");
  });
});
