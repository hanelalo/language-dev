import { describe, expect, it } from "vitest";
import { createOpenAIEngine } from "../../src/background/engines/openai-engine";

describe("OpenAI Engine", () => {
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
});