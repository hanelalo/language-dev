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

  it("appends glossary guide when provided", () => {
    const result = buildSystemPrompt({
      basePrompt: "Base prompt.",
      glossaryGuide: "- Kubernetes → keep original"
    });
    expect(result).toContain("# Article-Specific Glossary Guide");
    expect(result).toContain("- Kubernetes → keep original");
  });

  it("omits glossary section when not provided", () => {
    const result = buildSystemPrompt({
      basePrompt: "Base prompt."
    });
    expect(result).not.toContain("Glossary");
  });
});