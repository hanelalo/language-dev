import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "../../src/background/prompt-builder";

describe("buildSystemPrompt", () => {
  it("concats base + domain + user in order", () => {
    const result = buildSystemPrompt({
      basePrompt: "BASE",
      domainPrompt: "DOMAIN",
      userInstruction: "USER"
    });
    expect(result).toBe("BASE\n\nDOMAIN\n\nUSER");
  });
});