import { describe, expect, it } from "vitest";
import { runPageTranslationFlow } from "../../src/content/index";

describe("content flow", () => {
  it("translates extracted segments", async () => {
    const result = await runPageTranslationFlow("<p>Hello</p>");
    expect(result.completed).toBe(1);
  });
});
