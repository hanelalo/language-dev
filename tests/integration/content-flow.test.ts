import { describe, expect, it } from "vitest";
import { runPageTranslationFlow } from "../../src/content/index";

describe("content flow", () => {
  it("extracts and submits segments for translation", async () => {
    document.body.innerHTML = "<p>Hello</p>";
    const result = await runPageTranslationFlow();
    expect(result.total).toBe(1);
  });
});
