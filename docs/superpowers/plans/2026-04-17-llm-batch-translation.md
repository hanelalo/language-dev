# LLM Structured Batch Translation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send all paragraphs in a single API request for LLM engines, parse structured JSON array output, and degrade to per-segment translation on failure.

**Architecture:** Engine `batchTranslate` builds a structured prompt with numbered inputs, calls API once, and parses the JSON array response. `messages.ts` adds retry-once + fallback to per-segment translation. A new `parse-json-response.ts` handles robust JSON extraction with multiple fallback strategies.

**Tech Stack:** TypeScript, Vitest, Chrome Extension MV3

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/background/parse-json-response.ts` | **New.** Robust JSON array parsing with 3-strategy extraction and validation |
| `src/background/engines/prompt-utils.ts` | **Modify.** Add `buildBatchUserPrompt` |
| `src/background/engines/openai-engine.ts` | **Modify.** Rewrite `batchTranslate` to use single request + parse |
| `src/background/engines/custom-llm-engine.ts` | **Modify.** Rewrite `batchTranslate` to use single request + parse |
| `src/background/messages.ts` | **Modify.** LLM branch: call `batchTranslate`, retry once, degrade to per-segment |
| `tests/unit/parse-json-response.test.ts` | **New.** Tests for JSON parsing |
| `tests/unit/prompt-utils.test.ts` | **New.** Tests for `buildBatchUserPrompt` |
| `tests/unit/openai-engine.test.ts` | **Modify.** Add batch tests |
| `tests/unit/custom-llm-engine.test.ts` | **Modify.** Add batch tests |
| `tests/unit/messages.test.ts` | **New.** Tests for retry + degradation |

---

### Task 1: JSON Response Parser

**Files:**
- Create: `src/background/parse-json-response.ts`
- Test: `tests/unit/parse-json-response.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/unit/parse-json-response.test.ts
import { describe, expect, it } from "vitest";
import { parseTranslationArray } from "../../src/background/parse-json-response";

describe("parseTranslationArray", () => {
  it("parses clean JSON array", () => {
    const result = parseTranslationArray('["你好", "世界"]', 2);
    expect(result).toEqual({ ok: true, items: ["你好", "世界"] });
  });

  it("extracts JSON from markdown code block", () => {
    const raw = '```json\n["你好", "世界"]\n```';
    const result = parseTranslationArray(raw, 2);
    expect(result).toEqual({ ok: true, items: ["你好", "世界"] });
  });

  it("extracts JSON from plain code block", () => {
    const raw = '```\n["你好", "世界"]\n```';
    const result = parseTranslationArray(raw, 2);
    expect(result).toEqual({ ok: true, items: ["你好", "世界"] });
  });

  it("extracts JSON embedded in surrounding text by finding brackets", () => {
    const raw = 'Here is the translation:\n["你好", "世界"]\nDone.';
    const result = parseTranslationArray(raw, 2);
    expect(result).toEqual({ ok: true, items: ["你好", "世界"] });
  });

  it("fails when array length does not match expectedCount", () => {
    const result = parseTranslationArray('["你好"]', 2);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("length");
    }
  });

  it("fails when result is not an array", () => {
    const result = parseTranslationArray('{"1": "你好"}', 1);
    expect(result.ok).toBe(false);
  });

  it("fails when array contains non-strings", () => {
    const result = parseTranslationArray('[1, 2]', 2);
    expect(result.ok).toBe(false);
  });

  it("fails when array contains empty strings", () => {
    const result = parseTranslationArray('["你好", ""]', 2);
    expect(result.ok).toBe(false);
  });

  it("fails on completely invalid JSON", () => {
    const result = parseTranslationArray("not json at all", 1);
    expect(result.ok).toBe(false);
  });

  it("returns partial items when available on failure", () => {
    const result = parseTranslationArray('["你好"]', 3);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.partial).toEqual(["你好"]);
    }
  });

  it("handles single-element array", () => {
    const result = parseTranslationArray('["你好"]', 1);
    expect(result).toEqual({ ok: true, items: ["你好"] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest tests/unit/parse-json-response.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `parseTranslationArray`**

```typescript
// src/background/parse-json-response.ts
export type ParseResult =
  | { ok: true; items: string[] }
  | { ok: false; error: string; partial?: string[] };

export function parseTranslationArray(raw: string, expectedCount: number): ParseResult {
  const extracted = extractJsonString(raw);
  if (extracted === null) {
    return { ok: false, error: "No valid JSON found in response" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extracted);
  } catch {
    return { ok: false, error: "JSON parse failed" };
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, error: `Expected array, got ${typeof parsed}` };
  }

  if (parsed.length !== expectedCount) {
    const validItems = toValidStringArray(parsed);
    return {
      ok: false,
      error: `Expected ${expectedCount} items, got ${parsed.length}`,
      partial: validItems.length > 0 ? validItems : undefined,
    };
  }

  const items = toValidStringArray(parsed);
  if (items.length !== expectedCount) {
    return {
      ok: false,
      error: `Array contains non-string or empty elements`,
      partial: items.length > 0 ? items : undefined,
    };
  }

  return { ok: true, items };
}

function toValidStringArray(arr: unknown[]): string[] {
  const result: string[] = [];
  for (const item of arr) {
    if (typeof item === "string" && item.length > 0) {
      result.push(item);
    }
  }
  return result;
}

function extractJsonString(raw: string): string | null {
  // Strategy 1: Direct parse
  try {
    JSON.parse(raw);
    return raw;
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: Extract from markdown code block
  const codeBlockMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    const inner = codeBlockMatch[1].trim();
    try {
      JSON.parse(inner);
      return inner;
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 3: Find first [ and last ]
  const firstBracket = raw.indexOf("[");
  const lastBracket = raw.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const candidate = raw.slice(firstBracket, lastBracket + 1);
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // All strategies failed
    }
  }

  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest tests/unit/parse-json-response.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/background/parse-json-response.ts tests/unit/parse-json-response.test.ts
git commit -m "feat: add JSON response parser for batch translation"
```

---

### Task 2: Batch User Prompt Builder

**Files:**
- Modify: `src/background/engines/prompt-utils.ts`
- Test: `tests/unit/prompt-utils.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/unit/prompt-utils.test.ts
import { describe, expect, it } from "vitest";
import { buildBatchUserPrompt } from "../../src/background/engines/prompt-utils";

describe("buildBatchUserPrompt", () => {
  it("includes source and target language", () => {
    const result = buildBatchUserPrompt(["hello"], "en", "zh-CN");
    expect(result).toContain("en");
    expect(result).toContain("zh-CN");
  });

  it("includes all input texts numbered", () => {
    const result = buildBatchUserPrompt(["hello", "world", "foo"], "en", "zh-CN");
    expect(result).toContain("1. hello");
    expect(result).toContain("2. world");
    expect(result).toContain("3. foo");
  });

  it("states exact count requirement", () => {
    const result = buildBatchUserPrompt(["a", "b"], "en", "zh-CN");
    expect(result).toContain("exactly 3"); // 3 = 2 texts + 1 example
  });

  it("includes example format", () => {
    const result = buildBatchUserPrompt(["hello"], "en", "zh-CN");
    expect(result).toContain('["');
  });

  it("emphasizes JSON-only output", () => {
    const result = buildBatchUserPrompt(["hello"], "en", "zh-CN");
    expect(result).toContain("ONLY");
    expect(result).toContain("No explanation");
  });

  it("handles empty texts array", () => {
    const result = buildBatchUserPrompt([], "en", "zh-CN");
    expect(result).toContain("exactly 0");
  });

  it("handles texts with special characters", () => {
    const result = buildBatchUserPrompt(["hello \"world\"", "line\nbreak"], "en", "zh-CN");
    expect(result).toContain("1. hello \"world\"");
    expect(result).toContain("2. line\nbreak");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest tests/unit/prompt-utils.test.ts`
Expected: FAIL — `buildBatchUserPrompt` not exported

- [ ] **Step 3: Implement `buildBatchUserPrompt`**

Add to the end of `src/background/engines/prompt-utils.ts`:

```typescript
export function buildBatchUserPrompt(
  texts: string[],
  sourceLang: string,
  targetLang: string
): string {
  const numberedTexts = texts
    .map((text, i) => `${i + 1}. ${text}`)
    .join("\n");

  return [
    `Translate the following texts from ${sourceLang} to ${targetLang}.`,
    "",
    `Return ONLY a JSON array of translated strings. No explanation, no markdown, no extra text.`,
    `The array must have exactly ${texts.length} elements, in the same order as the input.`,
    "",
    `Example output format:`,
    `["translated1", "translated2", "translated3"]`,
    "",
    `Input texts:`,
    numberedTexts,
    "",
    `Output:`,
  ].join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest tests/unit/prompt-utils.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/background/engines/prompt-utils.ts tests/unit/prompt-utils.test.ts
git commit -m "feat: add buildBatchUserPrompt for structured batch translation"
```

---

### Task 3: Rewrite OpenAI Engine batchTranslate

**Files:**
- Modify: `src/background/engines/openai-engine.ts`
- Modify: `tests/unit/openai-engine.test.ts`

- [ ] **Step 1: Write the failing tests**

Add these tests inside the existing `describe("OpenAI Engine", ...)` block in `tests/unit/openai-engine.test.ts`:

```typescript
  describe("batchTranslate", () => {
    it("sends all texts in a single request with batch prompt", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch" as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '["你好", "世界"]' }]
        })
      } as Response);

      const engine = createOpenAIEngine("sk-test", "gpt-4o", "https://api.openai.com/v1");
      const results = await engine.batchTranslate(["hello", "world"], "en", "zh-CN");

      expect(fetchMock).toHaveBeenCalledOnce();
      const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
      expect(body.messages[1].content).toContain("1. hello");
      expect(body.messages[1].content).toContain("2. world");
      expect(results).toEqual(["你好", "世界"]);
    });

    it("throws on JSON parse failure", async () => {
      vi.spyOn(globalThis, "fetch" as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "not json at all" }]
        })
      } as Response);

      const engine = createOpenAIEngine("sk-test", "gpt-4o");
      await expect(
        engine.batchTranslate(["hello"], "en", "zh-CN")
      ).rejects.toThrow();
    });

    it("throws when array length mismatches", async () => {
      vi.spyOn(globalThis, "fetch" as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '["你好"]' }]
        })
      } as Response);

      const engine = createOpenAIEngine("sk-test", "gpt-4o");
      await expect(
        engine.batchTranslate(["hello", "world"], "en", "zh-CN")
      ).rejects.toThrow();
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest tests/unit/openai-engine.test.ts`
Expected: FAIL — `batchTranslate` currently loops individually

- [ ] **Step 3: Rewrite `batchTranslate`**

Replace the `batchTranslate` method in `createOpenAIEngine`:

```typescript
    async batchTranslate(
      texts: string[],
      sourceLang: string,
      targetLang: string,
      options?: TranslateOptions
    ): Promise<string[]> {
      const systemPrompt = buildSystemPrompt(
        options?.systemPrompt,
        customPrompt,
        sourceLang,
        targetLang,
        options?.domainPrompt,
        options?.glossaryGuide
      );
      const userPrompt = buildBatchUserPrompt(texts, sourceLang, targetLang);
      const raw = await callOpenAIAPI(apiKey, baseUrl, model, systemPrompt, userPrompt);
      const result = parseTranslationArray(raw, texts.length);
      if (!result.ok) {
        throw new Error(`Batch translation parse failed: ${result.error}`);
      }
      return result.items;
    },
```

Add the import at the top of `openai-engine.ts`:

```typescript
import { parseTranslationArray } from "../parse-json-response";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest tests/unit/openai-engine.test.ts`
Expected: All tests PASS (both existing and new)

- [ ] **Step 5: Commit**

```bash
git add src/background/engines/openai-engine.ts tests/unit/openai-engine.test.ts
git commit -m "feat: rewrite OpenAI batchTranslate to use single structured request"
```

---

### Task 4: Rewrite Custom LLM Engine batchTranslate

**Files:**
- Modify: `src/background/engines/custom-llm-engine.ts`
- Modify: `tests/unit/custom-llm-engine.test.ts`

- [ ] **Step 1: Write the failing tests**

Add these tests inside the existing `describe("Custom LLM Engine", ...)` block in `tests/unit/custom-llm-engine.test.ts`:

```typescript
  describe("batchTranslate", () => {
    it("sends all texts in a single request with batch prompt", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch" as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '["你好", "世界"]' }]
        })
      } as Response);

      const engine = createCustomLLMEngine("my-api", "sk-test", "gpt-4o-mini", "https://example.com/v1");
      const results = await engine.batchTranslate(["hello", "world"], "en", "zh-CN");

      expect(fetchMock).toHaveBeenCalledOnce();
      const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
      expect(body.messages[1].content).toContain("1. hello");
      expect(body.messages[1].content).toContain("2. world");
      expect(results).toEqual(["你好", "世界"]);
    });

    it("throws on JSON parse failure", async () => {
      vi.spyOn(globalThis, "fetch" as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "not json at all" }]
        })
      } as Response);

      const engine = createCustomLLMEngine("my-api", "sk-test", "gpt-4o-mini", "https://example.com/v1");
      await expect(
        engine.batchTranslate(["hello"], "en", "zh-CN")
      ).rejects.toThrow();
    });

    it("throws when array length mismatches", async () => {
      vi.spyOn(globalThis, "fetch" as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '["你好"]' }]
        })
      } as Response);

      const engine = createCustomLLMEngine("my-api", "sk-test", "gpt-4o-mini", "https://example.com/v1");
      await expect(
        engine.batchTranslate(["hello", "world"], "en", "zh-CN")
      ).rejects.toThrow();
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest tests/unit/custom-llm-engine.test.ts`
Expected: FAIL — `batchTranslate` currently loops individually

- [ ] **Step 3: Rewrite `batchTranslate`**

Replace the `batchTranslate` method in `createCustomLLMEngine`:

```typescript
    async batchTranslate(
      texts: string[],
      sourceLang: string,
      targetLang: string,
      options?: TranslateOptions,
    ): Promise<string[]> {
      const systemPrompt = buildSystemPrompt(
        options?.systemPrompt,
        customPrompt,
        sourceLang,
        targetLang,
        options?.domainPrompt,
        options?.glossaryGuide,
      );
      const userPrompt = buildBatchUserPrompt(texts, sourceLang, targetLang);
      const raw = await callCustomLLMAPI(apiKey, baseUrl, model, systemPrompt, userPrompt);
      const result = parseTranslationArray(raw, texts.length);
      if (!result.ok) {
        throw new Error(`Batch translation parse failed: ${result.error}`);
      }
      return result.items;
    },
```

Add the import at the top of `custom-llm-engine.ts`:

```typescript
import { parseTranslationArray } from "../parse-json-response";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest tests/unit/custom-llm-engine.test.ts`
Expected: All tests PASS (both existing and new)

- [ ] **Step 5: Commit**

```bash
git add src/background/engines/custom-llm-engine.ts tests/unit/custom-llm-engine.test.ts
git commit -m "feat: rewrite Custom LLM batchTranslate to use single structured request"
```

---

### Task 5: Messages Retry + Degradation

**Files:**
- Modify: `src/background/messages.ts`
- Test: `tests/unit/messages.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/unit/messages.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleTranslateBatch } from "../../src/background/messages";
import type { TranslateEngine } from "../../src/shared/types";

// Helper to create a mock LLM engine
function createMockLLMEngine(options: {
  batchSucceeds?: boolean;
  individualSucceeds?: boolean;
}): TranslateEngine {
  return {
    name: "mock-llm",
    type: "llm",
    translate: async (text: string) => {
      if (!options.individualSucceeds) throw new Error("individual fail");
      return `translated_${text}`;
    },
    batchTranslate: async (texts: string[]) => {
      if (!options.batchSucceeds) throw new Error("batch fail");
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
    vi.doMock("../../src/background/engine-registry", () => ({
      getEngine: () => createMockLLMEngine({ batchSucceeds: true }),
    }));
    vi.doMock("../../src/background/config-store", () => ({
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

    const { handleTranslateBatch } = await import("../../src/background/messages");
    const result = await handleTranslateBatch({ texts: ["hello", "world"] });

    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toEqual({ status: "ok", text: "translated_hello" });
    expect(result.results[1]).toEqual({ status: "ok", text: "translated_world" });
  });
});
```

**Note:** Due to module-level caching of `getEngine` and `getSettings` in `messages.ts`, mocking these requires dynamic imports. If static mocking proves unreliable, use `vi.spyOn` on the engine's `batchTranslate` and `translate` methods directly after importing the real module. The key behavior to verify is:

1. `batchTranslate` is called first
2. On failure, `batchTranslate` is retried once
3. On second failure, per-segment `translate` is called for each text

The test implementation may need adjustment based on the module import pattern — the engineer should verify the approach works with the existing module structure.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest tests/unit/messages.test.ts`
Expected: FAIL — currently no retry/degradation logic in LLM branch

- [ ] **Step 3: Implement retry + degradation in `messages.ts`**

Replace the LLM branch in `handleTranslateBatch` (lines 125-135) with:

```typescript
  // LLM engines: try structured batch first, then degrade to per-segment.
  const options = { systemPrompt, domainPrompt, glossaryGuide };

  // Attempt 1: structured batch
  try {
    const translations = await engine.batchTranslate(payload.texts, sourceLang, targetLang, options);
    const results: SegmentResult[] = translations.map(
      (text): SegmentResult => ({ status: "ok", text })
    );
    return { results };
  } catch {
    // Batch failed, continue to retry
  }

  // Attempt 2: retry batch once
  try {
    const translations = await engine.batchTranslate(payload.texts, sourceLang, targetLang, options);
    const results: SegmentResult[] = translations.map(
      (text): SegmentResult => ({ status: "ok", text })
    );
    return { results };
  } catch {
    // Batch retry failed, continue to degradation
  }

  // Degradation: per-segment translation with concurrency control and retry.
  const worker = async (text: string): Promise<string> => {
    return engine.translate(text, sourceLang, targetLang, options);
  };

  const results = await runBatchTranslateWithRetry(payload.texts, worker, {
    maxRetries: 2,
    baseDelayMs: 500,
  });

  return { results };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest tests/unit/messages.test.ts`
Expected: PASS

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/background/messages.ts tests/unit/messages.test.ts
git commit -m "feat: add retry and degradation logic for LLM batch translation"
```

---

### Task 6: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Build the extension**

Run: `npm run build` (or `pnpm build`)
Expected: Build succeeds with no errors

- [ ] **Step 3: Review all changes**

Run: `git diff HEAD~6 --stat`
Verify the changed files match the design doc file map.
