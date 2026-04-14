import { describe, expect, it } from "vitest";
import { extractSegments } from "../../src/content/dom-extractor";

describe("extractSegments", () => {
  it("extracts paragraph-like blocks as append mode", () => {
    document.body.innerHTML = "<main><p>Hello</p><aside><h3>World</h3></aside></main>";
    const segments = extractSegments();
    expect(segments.map((s) => s.text)).toEqual(["Hello", "World"]);
    expect(segments.every((s) => s.renderMode === "append")).toBe(true);
  });

  it("does not extract container div text as standalone segments", () => {
    document.body.innerHTML = "<div><p>Hello</p><p>World</p></div>";
    const segments = extractSegments();
    expect(segments.map((s) => s.text)).toEqual(["Hello", "World"]);
  });

  it("extracts button text with replace mode", () => {
    document.body.innerHTML = "<button>Log in</button>";
    const segments = extractSegments();
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe("Log in");
    expect(segments[0].renderMode).toBe("replace");
  });

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
