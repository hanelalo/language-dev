# LLM Structured Batch Translation

## Problem

LLM engines (OpenAI, Custom LLM) currently translate each paragraph via a separate API call. A batch of 10 paragraphs results in 10 individual requests (5 concurrent). This creates unnecessary network overhead and latency.

DeepL already uses true batch translation (one request per batch). LLM engines should do the same.

## Design

### Approach

Send all paragraphs in a single API request with structured input, and parse structured JSON output. On failure, retry once, then degrade to per-segment translation.

### Prompt Design

New `buildBatchUserPrompt(texts, sourceLang, targetLang)` in `prompt-utils.ts`:

```
Translate the following texts from {sourceLang} to {targetLang}.

Return ONLY a JSON array of translated strings. No explanation, no markdown, no extra text.
The array must have exactly {N} elements, in the same order as the input.

Example output format:
["translated1", "translated2", "translated3"]

Input texts:
1. {texts[0]}
2. {texts[1]}
...

Output:
```

Key points:
- Explicit array length requirement
- Example format provided
- Emphasis on JSON-only output
- Numbered input for alignment

### Mapping

Positional mapping (JSON array by index). Parse result is validated against `expectedCount` (must equal `texts.length`).

### Engine Changes

`batchTranslate` in `openai-engine.ts` and `custom-llm-engine.ts`:

1. Build system prompt (reuse existing `buildSystemPrompt`)
2. Build batch user prompt (new `buildBatchUserPrompt`)
3. Call API (reuse existing `callOpenAIAPI` / `callCustomLLMAPI`)
4. Parse JSON array response via `parseTranslationArray`
5. Validate array length matches input length
6. On parse failure: throw error (caller handles retry/degradation)

`translate` method unchanged. API call functions unchanged.

### JSON Parsing

New file `parse-json-response.ts` with `parseTranslationArray(raw: string, expectedCount: number)`:

Parse strategies (tried in order):
1. Direct `JSON.parse`
2. Extract JSON code block (` ```json ... ``` ` or ` ``` ... ``` `)
3. Extract content between first `[` and last `]`

Validation:
- Result must be `string[]`
- Length must equal `expectedCount`
- No empty strings

Return type:
```typescript
type ParseResult =
  | { ok: true; items: string[] }
  | { ok: false; error: string; partial?: string[] };
```

### Error Handling and Degradation

```
messages.ts handleTranslateBatch:
  1. Call engine.batchTranslate(texts)
     - ok -> return results
     - fail -> step 2
  2. Retry engine.batchTranslate(texts)
     - ok -> return results
     - fail -> step 3
  3. Degrade to per-segment translation
     - Use existing runBatchTranslateWithRetry(texts, engine.translate)
```

Retry/degradation logic lives in `messages.ts`, not in the engine layer. Engine's `batchTranslate` only handles one request + parse, throws on failure. Degradation reuses existing `translation-orchestrator.ts`.

### Files Changed

| File | Change |
|------|--------|
| `src/background/engines/prompt-utils.ts` | Add `buildBatchUserPrompt` |
| `src/background/engines/openai-engine.ts` | Rewrite `batchTranslate` |
| `src/background/engines/custom-llm-engine.ts` | Rewrite `batchTranslate` |
| `src/background/messages.ts` | LLM branch uses `batchTranslate`, add retry + degradation |
| `src/background/parse-json-response.ts` | **New** — JSON parsing utility |

Files unchanged:
- `translation-orchestrator.ts` — retained as degradation path
- `buildSystemPrompt` / `buildUserPrompt` — unchanged
- `callOpenAIAPI` / `callCustomLLMAPI` — unchanged
- Content scripts — unchanged, batch size controlled by content script (default 10, configurable)
