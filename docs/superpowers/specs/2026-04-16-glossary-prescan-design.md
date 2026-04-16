# Glossary Pre-scan for Translation Consistency

## Problem

When translating articles paragraph by paragraph, the LLM inconsistently handles the same term across different segments — sometimes translating it, sometimes keeping the original. This produces a jarring reading experience where "Kubernetes" appears as "Kubernetes" in one paragraph and "库伯奈提斯" in another.

## Solution

Add an optional pre-scan step: before translating segments, send the full article text to the LLM to generate a glossary guide of terms that should be handled consistently. Append this guide to the system prompt used for each segment's translation.

## Scope

- Applies only when ALL of the following are true:
  - The page is detected as an article (Readability article detection)
  - The translation engine is LLM-type (OpenAI, custom LLM)
  - The `glossaryPreScan` setting is enabled
- Non-article pages, non-LLM engines, and settings-off scenarios are completely unaffected

## Flow

```
User clicks translate
  → Extract segments (existing)
  → Is article page + LLM engine + glossaryPreScan enabled?
    → Yes → Concatenate full article text (title + body) → Call LLM with glossary prompt
           → Store glossary guide
    → No  → Skip
  → Translate segments in batches (existing, with glossary guide appended to system prompt if available)
  → Render results (existing)
```

## Glossary Pre-scan Prompt

### System prompt (fixed)

```
Analyze the following article text and produce a concise translation glossary guide.

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

Target language: {{target_lang}}
```

### User message

```
Title: {articleTitle}

{fullArticleText}
```

### Example output

```
- Kubernetes → keep original (proper noun)
- microservice → 微服务 (standard translation)
- John Smith → keep original (person name)
- containerization → 容器化 (standard translation)
- K8s → keep original (abbreviation)
```

### Integration into translation prompt

The glossary guide is appended to the system prompt as a new section:

```
{existing system prompt (base + domain + user instruction)}

# Article-Specific Glossary Guide

- Kubernetes → keep original (proper noun)
- microservice → 微服务 (standard translation)
...
```

## Settings

New field in `Settings`:

```ts
glossaryPreScan?: boolean; // default: false
```

- Toggle switch in the options page
- No conditional visibility — always shown regardless of engine type

## Code Changes

### Files to modify

1. **`src/shared/storage-schema.ts`** — Add `glossaryPreScan` to `Settings` type and `DEFAULT_SETTINGS`
2. **`src/shared/types.ts`** — Add `glossaryGuide?: string` to `TranslateOptions`
3. **`src/background/messages.ts`** — In `handleTranslateBatch`:
   - Accept full article text and title in payload (for pre-scan)
   - If `glossaryPreScan` enabled + LLM engine → call LLM to generate glossary guide
   - Pass glossary guide to worker via `TranslateOptions`
4. **`src/content/index.ts`** — In `runPageTranslationFlow`:
   - When article is detected, pass full text and title to background in translation request
   - Non-article pages: existing behavior, no change
5. **`src/background/engines/openai-engine.ts`** — In `buildSystemPrompt`: append `glossaryGuide` to final prompt
6. **`src/background/engines/custom-llm-engine.ts`** — Same treatment as openai-engine
7. **`src/options/App.tsx`** — Add toggle switch UI for `glossaryPreScan`

### Files NOT modified

- `dom-extractor.ts` — no changes
- `translation-orchestrator.ts` — no changes
- `translation-renderer.ts` — no changes
- `deepl-engine.ts` — not applicable (non-LLM)

## Edge Cases

- **Article too long for pre-scan**: If the concatenated article text exceeds 8000 characters, truncate to the first 8000 chars and append "[...truncated]" so the LLM still receives representative content
- **Pre-scan LLM call fails**: Fall back to normal translation without glossary guide, log a warning
- **Selection translate**: Not affected — single text selection doesn't need glossary pre-scan
