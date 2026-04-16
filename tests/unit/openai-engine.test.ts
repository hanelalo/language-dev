import { afterEach, describe, expect, it, vi } from "vitest";
import { createOpenAIEngine, DEFAULT_SYSTEM_PROMPT } from "../../src/background/engines/openai-engine";

describe("OpenAI Engine", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns correct name and type", () => {
    const engine = createOpenAIEngine("sk-test", "gpt-4o");
    expect(engine.name).toBe("openai");
    expect(engine.type).toBe("llm");
  });

  it("isConfigured returns true when API key is set", () => {
    const engine = createOpenAIEngine("sk-valid", "gpt-4o");
    expect(engine.isConfigured()).toBe(true);
  });

  it("isConfigured returns false when API key is empty", () => {
    const engine = createOpenAIEngine("", "gpt-4o");
    expect(engine.isConfigured()).toBe(false);
  });

  it("uses runtime system prompt and translation-only user instruction", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch" as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "如何" } }]
      })
    } as Response);

    const engine = createOpenAIEngine("sk-test", "gpt-4o", "https://api.openai.com/v1");
    await engine.translate("how", "auto", "zh-CN", {
      systemPrompt: "Translate to {{target_lang}} only.",
      domainPrompt: "Use concise Chinese."
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.messages[0].content).toContain("Translate to zh-CN only.");
    expect(body.messages[0].content).toContain("Use concise Chinese.");
    expect(body.messages[1].content).toContain("Return only the translated text");
    expect(body.messages[1].content).toContain("Source text:");
    expect(body.messages[1].content).toContain("how");
  });

  it("uses valid default endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch" as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "如何" } }]
      })
    } as Response);

    const engine = createOpenAIEngine("sk-test", "gpt-4o");
    await engine.translate("how", "auto", "zh-CN");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("DEFAULT_SYSTEM_PROMPT has structured markdown format with required sections", () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain("# Role");
    expect(DEFAULT_SYSTEM_PROMPT).toContain("# Task");
    expect(DEFAULT_SYSTEM_PROMPT).toContain("# Rules");
    expect(DEFAULT_SYSTEM_PROMPT).toContain("# Constraints");
    expect(DEFAULT_SYSTEM_PROMPT).toContain("# Examples");
    expect(DEFAULT_SYSTEM_PROMPT).toContain("{{target_lang}}");
    expect(DEFAULT_SYSTEM_PROMPT).toContain("{{source_lang}}");
    expect(DEFAULT_SYSTEM_PROMPT).toContain("Preserve the original meaning precisely");
  });

  it("appends glossary guide to system prompt", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch" as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "如何" } }]
      })
    } as Response);

    const engine = createOpenAIEngine("sk-test", "gpt-4o", "https://api.openai.com/v1");
    await engine.translate("how", "auto", "zh-CN", {
      glossaryGuide: "- Kubernetes → keep original"
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.messages[0].content).toContain("# Article-Specific Glossary Guide");
    expect(body.messages[0].content).toContain("- Kubernetes → keep original");
  });
});
