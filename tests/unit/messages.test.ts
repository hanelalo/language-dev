import { afterEach, describe, expect, it, vi } from "vitest";
import { handleTranslateBatch } from "../../src/background/messages";
import { registerEngine } from "../../src/background/engine-registry";
import type { TranslateEngine } from "../../src/shared/types";

// Mock chrome.storage for getSettings
vi.mock("../../src/background/config-store", () => ({
  getSettings: async () => ({
    defaultEngine: "mock-llm",
    sourceLang: "en",
    targetLang: "zh-CN",
    glossaryPreScan: false,
    currentDomain: null,
    systemPrompt: undefined,
  }),
  getDomainPrompt: async () => null,
}));

vi.mock("../../src/background/glossary-prescan", () => ({
  truncateArticleText: (t: string) => t,
  buildGlossarySystemPrompt: () => "glossary system",
  buildGlossaryUserMessage: () => "glossary user",
}));

let batchCallCount: number;
let individualCallCount: number;

function createMockLLMEngine(options: {
  batchFailCount?: number;
  individualSucceeds?: boolean;
}): TranslateEngine {
  batchCallCount = 0;
  individualCallCount = 0;

  return {
    name: "mock-llm",
    type: "llm",
    translate: async (text: string) => {
      individualCallCount++;
      if (options.individualSucceeds === false) throw new Error("individual fail");
      return `translated_${text}`;
    },
    batchTranslate: async (texts: string[]) => {
      batchCallCount++;
      if (options.batchFailCount !== undefined && batchCallCount <= options.batchFailCount) {
        throw new Error("batch fail");
      }
      return texts.map((t) => `translated_${t}`);
    },
    isConfigured: () => true,
  };
}

describe("handleTranslateBatch - LLM batch with degradation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("succeeds on first batch attempt", async () => {
    registerEngine(createMockLLMEngine({}));

    const result = await handleTranslateBatch({ texts: ["hello", "world"] });

    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toEqual({ status: "ok", text: "translated_hello" });
    expect(result.results[1]).toEqual({ status: "ok", text: "translated_world" });
    expect(batchCallCount).toBe(1);
    expect(individualCallCount).toBe(0);
  });

  it("retries batch once on failure, then succeeds", async () => {
    registerEngine(createMockLLMEngine({ batchFailCount: 1 }));

    const result = await handleTranslateBatch({ texts: ["hello"] });

    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toEqual({ status: "ok", text: "translated_hello" });
    expect(batchCallCount).toBe(2);
    expect(individualCallCount).toBe(0);
  });

  it("degrades to per-segment translation after batch fails twice", async () => {
    registerEngine(createMockLLMEngine({ batchFailCount: 2 }));

    const result = await handleTranslateBatch({ texts: ["hello", "world"] });

    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toEqual({ status: "ok", text: "translated_hello" });
    expect(result.results[1]).toEqual({ status: "ok", text: "translated_world" });
    expect(batchCallCount).toBe(2);
    expect(individualCallCount).toBe(2);
  });
});
