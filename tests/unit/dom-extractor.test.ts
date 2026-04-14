import { describe, expect, it } from "vitest";
import { extractSegments } from "../../src/content/dom-extractor";

describe("extractSegments", () => {
  it("skips code blocks", () => {
    document.body.innerHTML = "<p>Hello</p><code>const a=1</code>";
    const segments = extractSegments();
    expect(segments.map((s) => s.text)).toEqual(["Hello"]);
  });

  it("skips pre blocks", () => {
    document.body.innerHTML = "<p>Hello</p><pre>code block</pre>";
    const segments = extractSegments();
    expect(segments.map((s) => s.text)).toEqual(["Hello"]);
  });

  it("skips script blocks", () => {
    document.body.innerHTML = "<p>Hello</p><script>console.log('hi')</script>";
    const segments = extractSegments();
    expect(segments.map((s) => s.text)).toEqual(["Hello"]);
  });

  it("skips style blocks", () => {
    document.body.innerHTML = "<p>Hello</p><style>body { color: red }</style>";
    const segments = extractSegments();
    expect(segments.map((s) => s.text)).toEqual(["Hello"]);
  });

  it("skips elements with translate=no", () => {
    document.body.innerHTML = '<p>Hello</p><div translate="no">Do not translate</div>';
    const segments = extractSegments();
    expect(segments.map((s) => s.text)).toEqual(["Hello"]);
  });
});
