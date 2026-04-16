# Article-Only Translation Design

## Problem

When translating blog posts and articles, the extension currently translates all visible text on the page, including navigation, sidebars, footers, and comments. Users reading articles typically only need the title and body content translated.

## Goal

Automatically detect article pages and translate only the title and main content. Non-article pages continue to use full-page translation. No extra user interaction required.

## Approach

Integrate Mozilla's Readability.js to detect and extract article content. When a page is identified as an article, translate only the extracted content; otherwise, fall back to the existing full-page translation.

## Core Flow

```
User clicks translate
  ↓
Readability.parse(document)
  ↓
Valid article detected (title + content returned)?
  ├─ Yes → Mark text nodes in original DOM with data-wpt-rid IDs
  │        → Parse Readability content HTML → extract marked nodes
  │        → Translate only article nodes → render translations back to original DOM via IDs
  └─ No  → Fall back to existing full-page translation flow
```

## DOM Mapping Strategy

Readability returns a cleaned HTML copy of the article content. This copy's DOM nodes are not the same objects as the original page DOM. To render translations back to the correct positions:

1. Before calling Readability, assign `data-wpt-rid` attributes with unique IDs to all text nodes in the document
2. Readability preserves standard HTML attributes in its output, so these markers survive the parsing
3. Extract text nodes from Readability's content HTML by their `data-wpt-rid` markers
4. After translation, use the marker IDs to locate original DOM nodes and render translations there

This approach is more reliable than XPath because Readability may restructure the HTML (removing wrapper divs, etc.), invalidating XPath references.

## Article Detection

- Use `@mozilla/readability`'s `Readability.parse()` method
- A page is considered an article if `parse()` returns a non-null `content` field
- The `title` and `content` fields are used to identify article regions
- No minimum content length threshold; Readability's built-in heuristics handle this

## UI Changes

- No changes to Popup or Options UI
- No changes to floating toggle behavior
- Users are not exposed to the article-vs-full-page distinction during normal use
- Nice-to-have (not in scope): status indicator showing "article-only" mode with option to expand to full page

## File Changes

### New Files

- `src/content/article-detector.ts` — Wraps Readability, provides `detectArticle(document): ArticleInfo | null`
  - `ArticleInfo`: `{ title: string, contentHTML: string, isArticle: boolean }`

### Modified Files

- `src/content/index.ts` — Call `detectArticle()` before translation; branch on article detection result
- `src/content/dom-extractor.ts` — Add `extractFromArticle(articleInfo)` method that extracts text nodes from Readability content DOM (reuse existing extraction logic)
- `src/content/translation-renderer.ts` — Support rendering translations to original DOM nodes via `data-wpt-rid` marker IDs

### New Dependency

- `@mozilla/readability` npm package (~50KB added to bundle)

### Unchanged

- Background service worker — no changes
- Popup / Options UI — no changes
- Translation engines (DeepL, OpenAI, custom LLM) — no changes
- Floating toggle — no changes
