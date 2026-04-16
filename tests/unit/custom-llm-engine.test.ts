import { afterEach, describe, expect, it, vi } from "vitest";
import { createCustomLLMEngine } from "../../src/background/engines/custom-llm-engine";

describe("Custom LLM Engine", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses runtime system prompt and translation-only user instruction", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch" as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "如何" } }]
      })
    } as Response);

    const engine = createCustomLLMEngine(
      "my-api",
      "sk-test",
      "gpt-4o-mini",
      "https://example.com/v1"
    );

    await engine.translate("how", "auto", "zh-CN", {
      systemPrompt: "Translate to {{target_lang}} only.",
      domainPrompt: "Use concise Chinese."
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example.com/v1/chat/completions");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.messages[0].content).toContain("Translate to zh-CN only.");
    expect(body.messages[0].content).toContain("Use concise Chinese.");
    expect(body.messages[1].content).toContain("Return only the translated text");
    expect(body.messages[1].content).toContain("Source text:");
    expect(body.messages[1].content).toContain("how");
  });

  it("appends glossary guide to system prompt", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch" as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "如何" } }]
      })
    } as Response);

    const engine = createCustomLLMEngine(
      "my-api",
      "sk-test",
      "gpt-4o-mini",
      "https://example.com/v1"
    );

    await engine.translate("how", "auto", "zh-CN", {
      glossaryGuide: "- K8s → keep original"
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.messages[0].content).toContain("# Article-Specific Glossary Guide");
    expect(body.messages[0].content).toContain("- K8s → keep original");
  });
});

