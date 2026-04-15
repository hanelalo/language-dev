# Agent Guide: Web Page Translator Extension

## Project Overview

Chrome Extension (Manifest V3) that translates web pages using multiple translation engines (DeepL, OpenAI, custom LLM endpoints) with domain-specific prompt optimization. Built with Vite + React + TypeScript.

## Essential Commands

```bash
pnpm dev          # Dev server with HMR (for manual testing in browser)
pnpm build        # Production build → dist/
pnpm test         # Run all tests (vitest, jsdom environment)
pnpm test:watch   # Watch mode for development
```

## Architecture

```
┌─────────────┐    chrome.runtime.sendMessage     ┌──────────────────┐
│ Content     │ ─────────────────────────────────▶ │ Background       │
│ Script      │     SUBMIT_SEGMENTS_BATCH          │ Service Worker   │
│ (runs in    │ ◀───────────────────────────────── │                  │
│  web page)  │     { results: [...] }            │ • Engine Registry│
└─────────────┘                                    │ • Message Handler│
                                                   │ • Translation    │
  • DOM extraction                                  │   Orchestrator    │
  • Translation renderer                             └────────┬─────────┘
  • Floating toggle (draggable)                              │
  • Selection tooltip                                        ▼
                                                  ┌─────────────────────┐
                                                  │ TranslateEngine[]   │
                                                  │ • deepl-engine      │
                                                  │ • openai-engine     │
                                                  │ • custom-llm-engine │
                                                  └─────────────────────┘
```

### Key Entry Points

- **Background entry**: `src/background/index.ts` — registers engines, sets up message listener
- **Content entry**: `src/content/index.ts` — `runPageTranslationFlow()`, selection tooltip, floating toggle
- **Message handler**: `src/background/messages.ts` — `handleTranslateBatch()`
- **Orchestrator**: `src/background/translation-orchestrator.ts` — `runBatchTranslateWithRetry()` with exponential backoff

### Message Flow

1. Content script calls `chrome.runtime.sendMessage({ type: SUBMIT_SEGMENTS_BATCH, payload: { texts } })`
2. Background `index.ts` receives message, ensures engines initialized, forwards to `handleTranslateBatch`
3. `handleTranslateBatch` in `messages.ts` gets engine from registry, calls `runBatchTranslateWithRetry`
4. Results returned via the async `sendResponse` pattern (returns `true` to keep channel open)
5. Content script receives response and updates DOM

### MV3 Cold Start Handling

Background initializes engines lazily on first message via `ensureEnginesInitialized()`. This is critical because MV3 service workers can cold-start between requests. The message listener waits for this promise before handling.

## Directory Structure

```
src/
├── background/          # Service Worker
│   ├── index.ts        # Entry: message listener, engine registration, cold-start init
│   ├── messages.ts     # Message handler (handleTranslateBatch)
│   ├── engine-registry.ts  # Singleton Map<string, TranslateEngine>
│   ├── translation-orchestrator.ts  # Batch + retry logic
│   ├── prompt-builder.ts
│   ├── config-store.ts  # chrome.storage.local wrapper (settings, domains, engine configs)
│   └── engines/
│       ├── deepl-engine.ts
│       ├── openai-engine.ts
│       └── custom-llm-engine.ts
├── content/            # Content Script (injected into all pages)
│   ├── index.ts       # Entry + floating toggle + selection tooltip
│   ├── dom-extractor.ts  # extractSegments()
│   ├── translation-renderer.ts  # render/update translation blocks
│   └── selection-translate.ts  # (referenced in README but merged into index.ts)
├── popup/              # Extension popup UI (React)
├── options/            # Options page UI (React)
└── shared/
    ├── types.ts       # TranslateEngine interface, Segment type, SegmentResult
    ├── constants.ts   # MESSAGE_TYPES
    └── storage-schema.ts  # DEFAULT_SETTINGS, chrome.storage schema
```

## Patterns and Conventions

### TranslateEngine Interface

All engines implement:
```typescript
interface TranslateEngine {
  name: string;
  type: "api" | "llm";
  translate(text: string, sourceLang: string, targetLang: string, options?: TranslateOptions): Promise<string>;
  batchTranslate(texts: string[], sourceLang: string, targetLang: string, options?: TranslateOptions): Promise<string[]>;
  isConfigured(): boolean;
}
```

Engines are registered at startup (even with empty keys) to avoid null checks downstream. `isConfigured()` gates actual API calls.

### Retry Logic

`runBatchTranslateWithRetry` in `translation-orchestrator.ts` handles retry with exponential backoff (`baseDelayMs * 2^attempt`). Default: 2 retries, 500ms base delay. Individual segment failures do NOT block other segments in the batch.

### Storage Pattern

All storage uses `chrome.storage.local` with a callback-based Promise wrapper pattern:
```typescript
// config-store.ts
export async function getSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["settings"], (result) => {
      resolve(result.settings ?? DEFAULT_SETTINGS);
    });
  });
}
```

### Domain Prompt Merging

`getDomains()` in `config-store.ts` merges stored domains with `BUILTIN_DOMAINS`. Stored domains override builtins by ID. This means built-in domain prompts can be edited and persist across reloads.

### Custom LLM Engine

Custom APIs are stored separately in `customApis` array in storage, each containing `{ name, apiKey, model, baseUrl }`. At background init time, each configured custom API registers a `createCustomLLMEngine()` instance.

### Selection Tooltip State

Selection tooltip uses extended `HTMLElement` properties (`_outsideClickHandler`, `_escHandler`) stored directly on the DOM element to track event listeners for cleanup. These are declared in `content/index.ts`'s `declare global` block.

### Translation Renderer

Uses DOM markers (`data-wpt-segment-id`, `data-wpt-status`) on original elements. Translation blocks are inserted as siblings after original content. Status-driven styling (gray/green/purple/red) is applied via `updateSegmentStatus()`.

## Testing

Tests use **vitest** with **jsdom** environment. Setup file at `tests/setup.ts` mocks the `chrome` global. The mock provides `chrome.runtime.openOptionsPage`, `chrome.storage.local.get`/`set`.

```bash
pnpm test                    # Run all
pnpm test:watch              # Watch mode
pnpm vitest run tests/unit/<specific>.test.ts  # Single file
```

Unit tests cover: orchestrator retry logic, DOM extraction, config store, engine implementations, prompt building, popup/options rendering.

## Gotchas

1. **Async message response**: Background message listener returns `true` to keep the message channel open for async `sendResponse`. If you forget `return true`, the response arrives but may be ignored.

2. **MV3 service worker cold start**: `ensureEnginesInitialized()` is called both eagerly at module load AND lazily on first message to handle the race between service worker startup and content script requests.

3. **Selection tooltip `contains()` check**: Tooltip uses `tooltip.contains(e.target as Node)` to detect outside clicks (returns `true` if target IS inside tooltip, so you invert it). The prior approach used a boolean flag that had issues with `DOM.contains()` semantics.

4. **DeepL batch format**: DeepL API accepts `text` as joined with `\n` and returns translations in the same order. The engine maps `data.translations.map(t => t.text)`.

5. **Engine name collision**: `registerEngine()` simply overwrites by name. Registering the same engine twice replaces it, which is intentional for re-initialization with actual API keys.

6. **Domain prompt only for LLM engines**: `handleTranslateBatch` only passes `domainPrompt` when `engine.type === "llm"`. DeepL (type "api") ignores it.

7. **Translation renderer idempotency**: `renderTranslationBlock` checks if a block already exists before creating. However, `updateSegmentStatus` updates existing blocks by `data-wpt-segment-id` attribute.

8. **Floating toggle drag detection**: The toggle button uses `dataset.dragged` to distinguish clicks from drags. A pointer move > 3px in any direction sets `dragged=1`, and the click handler skips translation if `dragged=1`.

9. **Batched translation size**: Page translations are batched at 10 segments per request (`batchSize = 10` in `content/index.ts`).

10. **Test chrome mock is minimal**: The `tests/setup.ts` chrome mock only handles `openOptionsPage` and `storage.local.get/set`. Tests that need other chrome APIs (e.g., `runtime.sendMessage`) require additional mock setup.
