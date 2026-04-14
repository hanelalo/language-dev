import { describe, expect, it } from "vitest";
import { extractSegmentsFromHtml } from "../../src/content/dom-extractor";

describe("extractSegmentsFromHtml", () => {
  it("skips code blocks", () => {
    const segments = extractSegmentsFromHtml("<p>Hello</p><code>const a=1</code>");
    expect(segments.map((s) => s.text)).toEqual(["Hello"]);
  });
});