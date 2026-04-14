import { describe, expect, it } from "vitest";
import { extractSegmentsFromHtml } from "../../src/content/dom-extractor";

describe("extractSegmentsFromHtml", () => {
  it("skips code blocks", () => {
    const segments = extractSegmentsFromHtml("<p>Hello</p><code>const a=1</code>");
    expect(segments.map((s) => s.text)).toEqual(["Hello"]);
  });

  it("skips pre blocks", () => {
    const segments = extractSegmentsFromHtml("<p>Hello</p><pre>code block</pre>");
    expect(segments.map((s) => s.text)).toEqual(["Hello"]);
  });

  it("skips script blocks", () => {
    const segments = extractSegmentsFromHtml("<p>Hello</p><script>console.log('hi')</script>");
    expect(segments.map((s) => s.text)).toEqual(["Hello"]);
  });

  it("skips style blocks", () => {
    const segments = extractSegmentsFromHtml("<p>Hello</p><style>body { color: red }</style>");
    expect(segments.map((s) => s.text)).toEqual(["Hello"]);
  });

  it("skips elements with translate=no", () => {
    const segments = extractSegmentsFromHtml('<p>Hello</p><div translate="no">Do not translate</div>');
    expect(segments.map((s) => s.text)).toEqual(["Hello"]);
  });
});
