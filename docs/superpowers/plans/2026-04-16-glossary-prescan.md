# Glossary Pre-scan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional pre-scan step that generates a glossary guide from the full article text before translating, ensuring consistent term handling across all segments.

**Architecture:** Before translating article segments, concatenate the full article text (title + body), send it to the LLM with a specialized glossary prompt, and append the resulting glossary guide to the system prompt for each segment translation. The feature is gated by a `glossaryPreScan` boolean setting and only activates for LLM engines on article pages.

**Tech Stack:** TypeScript, Chrome Extension MV3, Vitest, React (options page)

---

### Task 1: Add `glossaryPreScan` to Settings and `glossaryGuide` to TranslateOptions

**Files:**
- Modify: `src/shared/storage-schema.ts`
- Modify: `src/shared/types.ts`
- Test: `tests/unit/prompt-builder.test.ts`

- [ ] **Step 1: Add `glossaryPreScan` to Settings type and defaults**

In `src/shared/storage-schema.ts`, add `glossaryPreScan: boolean` to the `Settings` type and set default to `false`:

```ts
export type Settings = {
  sourceLang: string;
  targetLang: string;
  defaultEngine: string;
  selectionTranslate: boolean;
  currentDomain: string;
  systemPrompt?: string;
  glossaryPreScan?: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  sourceLang: "auto",
  targetLang: "zh-CN",
  defaultEngine: "deepl",
  selectionTranslate: true,
  currentDomain: "it",
  systemPrompt: "",
  glossaryPreScan: false,
};
```

- [ ] **Step 2: Add `glossaryGuide` to TranslateOptions**

In `src/shared/types.ts`, add `glossaryGuide?: string` to `TranslateOptions`:

```ts
export type TranslateOptions = {
  systemPrompt?: string;
  domainPrompt?: string;
  userInstruction?: string;
  glossaryGuide?: string;
};
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/storage-schema.ts src/shared/types.ts
git commit -m "feat: add glossaryPreScan setting and glossaryGuide option type"
```

---

### Task 2: Extract shared `buildSystemPrompt` with glossary support

Both `openai-engine.ts` and `custom-llm-engine.ts` duplicate the same `buildSystemPrompt` function. Rather than modifying both copies identically, extract a shared version that handles `glossaryGuide`.

**Files:**
- Modify: `src/background/prompt-builder.ts`
- Modify: `src/background/engines/openai-engine.ts`
- Modify: `src/background/engines/custom-llm-engine.ts`
- Test: `tests/unit/prompt-builder.test.ts`
- Test: `tests/unit/openai-engine.test.ts`
- Test: `tests/unit/custom-llm-engine.test.ts`

- [ ] **Step 1: Write failing tests for glossary guide in prompt builder**

In `tests/unit/prompt-builder.test.ts`, add tests:

```ts
import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "../../src/background/prompt-builder";

describe("buildSystemPrompt", () => {
  it("joins base, domain, and user instruction", () => {
    const result = buildSystemPrompt({
      basePrompt: "Base prompt.",
      domainPrompt: "Domain prompt.",
      userInstruction: "User instruction."
    });
    expect(result).toContain("Base prompt.");
    expect(result).toContain("Domain prompt.");
    expect(result).toContain("User instruction.");
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/prompt-builder.test.ts`
Expected: FAIL — `buildSystemPrompt` doesn't accept `glossaryGuide` yet, and test for "appends glossary guide" fails.

- [ ] **Step 3: Rewrite shared prompt builder with glossary support**

Replace `src/background/prompt-builder.ts` entirely:

```ts
type PromptInput = {
  basePrompt: string;
  domainPrompt?: string;
  userInstruction?: string;
  glossaryGuide?: string;
};

export function buildSystemPrompt(input: PromptInput): string {
  const parts = [input.basePrompt, input.domainPrompt, input.userInstruction]
    .map((v) => (v ?? "").trim())
    .filter(Boolean);

  let prompt = parts.join("\n\n");

  if (input.glossaryGuide?.trim()) {
    prompt += `\n\n# Article-Specific Glossary Guide\n\n${input.glossaryGuide.trim()}`;
  }

  return prompt.trim();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/prompt-builder.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/background/prompt-builder.ts tests/unit/prompt-builder.test.ts
git commit -m "feat: add glossary guide support to shared prompt builder"
```

---

### Task 3: Wire glossary guide into OpenAI and Custom LLM engines

Both engines currently have their own `buildSystemPrompt` (which does template variable substitution like `{{target_lang}}`). The shared `buildSystemPrompt` from `prompt-builder.ts` doesn't do variable substitution — that's a separate concern. The engines should continue doing their own variable substitution, then pass the result as `basePrompt` to the shared builder, along with `glossaryGuide` from `options`.

**Files:**
- Modify: `src/background/engines/openai-engine.ts`
- Modify: `src/background/engines/custom-llm-engine.ts`
- Test: `tests/unit/openai-engine.test.ts`
- Test: `tests/unit/custom-llm-engine.test.ts`

- [ ] **Step 1: Write failing test for glossary guide in OpenAI engine**

Add to `tests/unit/openai-engine.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/openai-engine.test.ts`
Expected: FAIL — glossary guide is not appended yet.

- [ ] **Step 3: Modify OpenAI engine to accept and append glossary guide**

The simplest approach: add `glossaryGuide` as a parameter to the engine's internal `buildSystemPrompt` and append it to the result, same way `domainPrompt` is already handled.

In `src/background/engines/openai-engine.ts`, change the `translate` method's `buildSystemPrompt` call:

```ts
async translate(
  text: string,
  sourceLang: string,
  targetLang: string,
  options?: TranslateOptions
): Promise<string> {
  const systemPrompt = buildSystemPrompt(
    options?.systemPrompt,
    customPrompt,
    sourceLang,
    targetLang,
    options?.domainPrompt,
    options?.glossaryGuide
  );
  const userPrompt = buildUserPrompt(text, sourceLang, targetLang);
  return callOpenAIAPI(apiKey, baseUrl, model, systemPrompt, userPrompt);
},
```

Update `buildSystemPrompt` function signature and body:

```ts
function buildSystemPrompt(
  runtimePrompt: string | undefined,
  customPrompt: string | undefined,
  sourceLang: string,
  targetLang: string,
  domainPrompt?: string,
  glossaryGuide?: string
): string {
  const template = runtimePrompt || customPrompt || DEFAULT_SYSTEM_PROMPT;
  const prompt = template
    .replace(/\{\{target_lang\}\}/g, targetLang)
    .replace(/\{\{source_lang\}\}/g, sourceLang)
    .replace(/\{\{domain_prompt\}\}/g, domainPrompt ?? "");

  let result: string;

  if (domainPrompt && !template.includes("{{domain_prompt}}")) {
    result = `${prompt}\n\n${domainPrompt}`.trim();
  } else {
    result = prompt.trim();
  }

  if (glossaryGuide?.trim()) {
    result += `\n\n# Article-Specific Glossary Guide\n\n${glossaryGuide.trim()}`;
  }

  return result;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/openai-engine.test.ts`
Expected: All PASS

- [ ] **Step 5: Write failing test for Custom LLM engine**

Add to `tests/unit/custom-llm-engine.test.ts`:

```ts
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
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run tests/unit/custom-llm-engine.test.ts`
Expected: FAIL

- [ ] **Step 7: Apply same changes to custom-llm-engine.ts**

Same pattern as openai-engine: add `glossaryGuide` parameter to `buildSystemPrompt`, pass `options?.glossaryGuide` from `translate`, and append it to the result.

In `src/background/engines/custom-llm-engine.ts`:

1. Update `translate` method to pass `options?.glossaryGuide`:

```ts
async translate(
  text: string,
  sourceLang: string,
  targetLang: string,
  options?: TranslateOptions
): Promise<string> {
  const systemPrompt = buildSystemPrompt(
    options?.systemPrompt,
    customPrompt,
    sourceLang,
    targetLang,
    options?.domainPrompt,
    options?.glossaryGuide
  );
  const userPrompt = buildUserPrompt(text, sourceLang, targetLang);
  return callCustomLLMAPI(apiKey, baseUrl, model, systemPrompt, userPrompt);
},
```

2. Update `buildSystemPrompt` function signature and body (identical logic to openai-engine):

```ts
function buildSystemPrompt(
  runtimePrompt: string | undefined,
  customPrompt: string | undefined,
  sourceLang: string,
  targetLang: string,
  domainPrompt?: string,
  glossaryGuide?: string
): string {
  const template = runtimePrompt || customPrompt || DEFAULT_SYSTEM_PROMPT;
  const prompt = template
    .replace(/\{\{target_lang\}\}/g, targetLang)
    .replace(/\{\{source_lang\}\}/g, sourceLang)
    .replace(/\{\{domain_prompt\}\}/g, domainPrompt ?? "");

  let result: string;

  if (domainPrompt && !template.includes("{{domain_prompt}}")) {
    result = `${prompt}\n\n${domainPrompt}`.trim();
  } else {
    result = prompt.trim();
  }

  if (glossaryGuide?.trim()) {
    result += `\n\n# Article-Specific Glossary Guide\n\n${glossaryGuide.trim()}`;
  }

  return result;
}
```

- [ ] **Step 8: Run tests**

Run: `npx vitest run tests/unit/custom-llm-engine.test.ts`
Expected: All PASS

- [ ] **Step 9: Run full test suite**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 10: Commit**

```bash
git add src/background/engines/openai-engine.ts src/background/engines/custom-llm-engine.ts tests/unit/openai-engine.test.ts tests/unit/custom-llm-engine.test.ts
git commit -m "feat: append glossary guide to system prompt in LLM engines"
```

---

### Task 4: Create glossary pre-scan module

**Files:**
- Create: `src/background/glossary-prescan.ts`
- Test: `tests/unit/glossary-prescan.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/glossary-prescan.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { generateGlossaryGuide, buildGlossarySystemPrompt, buildGlossaryUserMessage, truncateArticleText } from "../../src/background/glossary-prescan";

describe("truncateArticleText", () => {
  it("returns text as-is when under limit", () => {
    const text = "Short article.";
    expect(truncateArticleText(text, 100)).toBe(text);
  });

  it("truncates and appends marker when over limit", () => {
    const text = "a".repeat(100);
    expect(truncateArticleText(text, 50)).toBe("a".repeat(50) + "\n[...truncated]");
  });

  it("includes title in user message", () => {
    const msg = buildGlossaryUserMessage("My Title", "Some body text");
    expect(msg).toContain("Title: My Title");
    expect(msg).toContain("Some body text");
  });

  it("replaces {{target_lang}} in system prompt", () => {
    const prompt = buildGlossarySystemPrompt("zh-CN");
    expect(prompt).toContain("Target language: zh-CN");
    expect(prompt).not.toContain("{{target_lang}}");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/glossary-prescan.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Implement glossary-prescan module**

Create `src/background/glossary-prescan.ts`:

```ts
const MAX_ARTICLE_LENGTH = 8000;

export const GLOSSARY_SYSTEM_PROMPT = `Analyze the following article text and produce a concise translation glossary guide.

Output a list of terms that should be handled consistently when translating, in this format:
- Term → translation / keep original (reason)

Categories to identify:
1. Proper nouns (people, places, organizations) — keep original unless a well-known translation exists
2. Technical terms and jargon — keep original or use standard translated term
3. Brand names and product names — keep original
4. Acronyms and abbreviations — keep original

Rules:
- Only list terms that appear multiple times or are important for translation consistency
- Keep the guide concise — max 50 terms
- If a term should be translated, provide the target language translation
- Output ONLY the glossary, no explanations

Target language: {{target_lang}}`;

export function buildGlossarySystemPrompt(targetLang: string): string {
  return GLOSSARY_SYSTEM_PROMPT.replace(/\{\{target_lang\}\}/g, targetLang);
}

export function buildGlossaryUserMessage(title: string, articleText: string): string {
  return `Title: ${title}\n\n${articleText}`;
}

export function truncateArticleText(text: string, maxLength: number = MAX_ARTICLE_LENGTH): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "\n[...truncated]";
}

export async function generateGlossaryGuide(
  title: string,
  articleText: string,
  targetLang: string,
  callLLM: (systemPrompt: string, userMessage: string) => Promise<string>
): Promise<string> {
  const truncated = truncateArticleText(articleText);
  const systemPrompt = buildGlossarySystemPrompt(targetLang);
  const userMessage = buildGlossaryUserMessage(title, truncated);

  return callLLM(systemPrompt, userMessage);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/glossary-prescan.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/background/glossary-prescan.ts tests/unit/glossary-prescan.test.ts
git commit -m "feat: add glossary pre-scan module"
```

---

### Task 5: Wire glossary pre-scan into message handler

The `handleTranslateBatch` in `messages.ts` needs to: (1) accept article title and full text from the payload, (2) check if pre-scan is enabled, (3) call the LLM to generate the glossary guide, (4) pass it through to the translate worker.

**Files:**
- Modify: `src/background/messages.ts`
- Modify: `src/shared/constants.ts` (add new message type for batch with article context)

- [ ] **Step 1: Add new message type**

In `src/shared/constants.ts`, add:

```ts
export const MESSAGE_TYPES = {
  START_PAGE_TRANSLATION: "START_PAGE_TRANSLATION",
  SUBMIT_SEGMENTS_BATCH: "SUBMIT_SEGMENTS_BATCH",
  SUBMIT_ARTICLE_BATCH: "SUBMIT_ARTICLE_BATCH",
  BATCH_RESULT: "BATCH_RESULT",
  TRANSLATION_PROGRESS: "TRANSLATION_PROGRESS",
  TRANSLATION_ERROR: "TRANSLATION_ERROR",
  SELECTION_TRANSLATE: "SELECTION_TRANSLATE",
} as const;
```

- [ ] **Step 2: Add `handleArticleTranslateBatch` function in messages.ts**

The pre-scan reuses `engine.translate()` by passing the glossary prompt as the system prompt and the article text as the "text to translate." The LLM follows the system prompt instructions (glossary generation) regardless of the user prompt wrapper. This avoids changing the engine interface.

Add import at top of `src/background/messages.ts`:

```ts
import { truncateArticleText, buildGlossarySystemPrompt, buildGlossaryUserMessage } from "./glossary-prescan";
```

Add new payload type and handler after the existing `handleTranslateBatch`:

```ts
export type ArticleTranslateBatchPayload = TranslateBatchPayload & {
  articleTitle: string;
  articleText: string;
};

export async function handleArticleTranslateBatch(
  payload: ArticleTranslateBatchPayload
): Promise<TranslateBatchResult> {
  const settings = await getSettings();
  const sourceLang = payload.sourceLang ?? settings.sourceLang;
  const targetLang = payload.targetLang ?? settings.targetLang;
  const engineName = settings.defaultEngine;

  const engine = getEngine(engineName);
  if (!engine) {
    return {
      results: payload.texts.map(() => ({
        status: "failed" as const,
        error: `Engine ${engineName} not found`,
      })),
    };
  }

  if (!engine.isConfigured()) {
    return {
      results: payload.texts.map(() => ({
        status: "failed" as const,
        error: `Engine ${engineName} not configured`,
      })),
    };
  }

  let domainPrompt: string | undefined;
  if (settings.currentDomain && engine.type === "llm") {
    domainPrompt = await getDomainPrompt(settings.currentDomain) ?? undefined;
  }

  const systemPrompt = settings.systemPrompt;

  // Glossary pre-scan: only for LLM engines with setting enabled
  let glossaryGuide: string | undefined;
  if (settings.glossaryPreScan && engine.type === "llm") {
    try {
      const glossaryUserMsg = buildGlossaryUserMessage(
        payload.articleTitle,
        truncateArticleText(payload.articleText)
      );
      glossaryGuide = await engine.translate(
        glossaryUserMsg,
        sourceLang,
        targetLang,
        { systemPrompt: buildGlossarySystemPrompt(targetLang) }
      );
    } catch {
      // Pre-scan failed — fall back to normal translation without glossary
      glossaryGuide = undefined;
    }
  }

  const worker = async (text: string): Promise<string> => {
    if (engine.type === "llm") {
      return engine.translate(text, sourceLang, targetLang, { systemPrompt, domainPrompt, glossaryGuide });
    }
    return engine.translate(text, sourceLang, targetLang);
  };

  const results = await runBatchTranslateWithRetry(payload.texts, worker, {
    maxRetries: 2,
    baseDelayMs: 500,
  });

  return { results };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/background/messages.ts src/shared/constants.ts
git commit -m "feat: add article batch handler with glossary pre-scan"
```

---

### Task 6: Wire new message type in background index

**Files:**
- Modify: `src/background/index.ts`

- [ ] **Step 1: Import and handle new message type**

In `src/background/index.ts`, add import:

```ts
import { handleTranslateBatch, handleArticleTranslateBatch } from "./messages";
```

Add new message listener case (alongside the existing `SUBMIT_SEGMENTS_BATCH` handler):

```ts
if (message.type === MESSAGE_TYPES.SUBMIT_ARTICLE_BATCH) {
  ensureEnginesInitialized()
    .then(() => handleArticleTranslateBatch(message.payload))
    .then((result) => sendResponse({ success: true, data: result }))
    .catch((error) => sendResponse({ success: false, error: error.message }));
  return true;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/background/index.ts
git commit -m "feat: wire article batch message type in background script"
```

---

### Task 7: Pass article context from content script

When `runPageTranslationFlow` detects an article, it should send batches via `SUBMIT_ARTICLE_BATCH` (with title + full text) instead of `SUBMIT_SEGMENTS_BATCH`.

**Files:**
- Modify: `src/content/index.ts`

- [ ] **Step 1: Modify runPageTranslationFlow to pass article context**

In `src/content/index.ts`, the article detection already stores `article` (with `title` and `contentHTML`). We need to:

1. Extract plain text from the article for the pre-scan
2. When sending batches for article pages, use `SUBMIT_ARTICLE_BATCH` with the title and text
3. For non-article pages, keep using `SUBMIT_SEGMENTS_BATCH`

The article's full text can be extracted from the segments themselves — concatenate all segment texts. But the title needs to be included separately.

In `runPageTranslationFlow`, after segments are extracted and before the batch loop, determine the message type and payload:

```ts
// Determine message type: article pages use SUBMIT_ARTICLE_BATCH
const isArticlePage = !!article;
const messageType = isArticlePage ? MESSAGE_TYPES.SUBMIT_ARTICLE_BATCH : MESSAGE_TYPES.SUBMIT_SEGMENTS_BATCH;

// For article pages, build the full article text for glossary pre-scan
const articlePayload = isArticlePage ? {
  articleTitle: article!.title,
  articleText: segments.map(s => s.text).join("\n\n"),
} : {};
```

Then in the batch loop, update the message payload:

```ts
const response = await chrome.runtime.sendMessage({
  type: messageType,
  payload: {
    texts,
    ...articlePayload,
  },
});
```

Note: Import `MESSAGE_TYPES` from `../shared/constants` (already imported).

- [ ] **Step 2: Commit**

```bash
git add src/content/index.ts
git commit -m "feat: send article context for glossary pre-scan on article pages"
```

---

### Task 8: Add settings toggle in options page

**Files:**
- Modify: `src/options/App.tsx`
- Test: `tests/unit/options.test.tsx`

- [ ] **Step 1: Write failing test for toggle presence**

Add to `tests/unit/options.test.tsx`:

```ts
it("renders glossary pre-scan toggle", () => {
  render(<OptionsApp />);
  expect(screen.getByLabelText("术语表预扫描")).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/options.test.tsx`
Expected: FAIL — no element with that label exists.

- [ ] **Step 3: Add toggle UI**

In `src/options/App.tsx`, add a toggle in the "翻译设置" section, after the "翻译领域" select and before the system prompt textarea. Place it after the domain prompt preview box (after line 516) and before the "系统提示词模板" field (line 518):

```tsx
<div style={{ ...styles.field, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
  <label style={{ ...styles.label, marginBottom: 0 }}>术语表预扫描</label>
  <label style={{ position: "relative", display: "inline-block", width: 44, height: 24, cursor: "pointer" }}>
    <input
      type="checkbox"
      checked={settings.glossaryPreScan ?? false}
      onChange={(e) => setSettings({ ...settings, glossaryPreScan: e.target.checked })}
      aria-label="术语表预扫描"
      style={{ opacity: 0, width: 0, height: 0 }}
    />
    <span style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: settings.glossaryPreScan ? colors.primary : colors.border,
      borderRadius: 12,
      transition: "background-color 0.2s",
    }} />
    <span style={{
      position: "absolute",
      top: 2,
      left: settings.glossaryPreScan ? 22 : 2,
      width: 20,
      height: 20,
      backgroundColor: "#fff",
      borderRadius: "50%",
      transition: "left 0.2s",
      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
    }} />
  </label>
</div>
<p style={{ fontSize: 11, color: colors.textSecondary, marginTop: -12, marginBottom: 16 }}>
  翻译文章时，先扫描全文生成术语表以确保翻译一致性（仅 LLM 引擎生效）
</p>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/options.test.tsx`
Expected: All PASS

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add src/options/App.tsx tests/unit/options.test.tsx
git commit -m "feat: add glossary pre-scan toggle in settings UI"
```

---

### Task 9: Final integration check

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 2: Build the extension**

Run: `npx vite build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "chore: fix any integration issues"
```
