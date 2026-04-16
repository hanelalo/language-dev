# Article-Only Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically detect article pages and translate only title + body content, falling back to full-page translation for non-article pages.

**Architecture:** Integrate `@mozilla/readability` to detect articles. Before translation, mark text nodes with `data-wpt-rid` IDs, then parse with Readability. Use the preserved IDs in Readability's output to map translations back to original DOM nodes.

**Tech Stack:** TypeScript, @mozilla/readability, Vitest, jsdom

---

### Task 1: Install @mozilla/readability dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

Run: `pnpm add @mozilla/readability`
Expected: package added to dependencies, node_modules updated

- [ ] **Step 2: Verify build works**

Run: `pnpm build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @mozilla/readability dependency"
```

---

### Task 2: Create article-detector module

**Files:**
- Create: `src/content/article-detector.ts`
- Test: `tests/unit/article-detector.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/article-detector.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { detectArticle } from "../../src/content/article-detector";

describe("detectArticle", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("returns null for a page with minimal content", () => {
    document.body.innerHTML = `
      <nav>Home About Contact</nav>
      <div>
        <p>Short</p>
      </div>
      <footer>© 2024</footer>
    `;
    const result = detectArticle();
    expect(result).toBeNull();
  });

  it("detects a standard blog article", () => {
    document.body.innerHTML = `
      <header><nav>Home About</nav></header>
      <main>
        <article>
          <h1>Understanding TypeScript Generics</h1>
          <p>TypeScript generics allow you to create reusable components that work with a variety of types rather than a single one. This enables developers to write flexible, type-safe code that can be adapted to different situations.</p>
          <p>For example, a generic function can accept arguments of any type while still maintaining type information throughout the function body. This is particularly useful for collections and utility functions.</p>
          <p>Another advantage of generics is that they provide compile-time type safety without the need for type assertions or any type. The compiler will catch type mismatches before the code is ever executed.</p>
        </article>
      </main>
      <aside><h3>Related Posts</h3><p>Post A</p></aside>
      <footer>© 2024</footer>
    `;
    const result = detectArticle();
    expect(result).not.toBeNull();
    expect(result!.isArticle).toBe(true);
    expect(result!.title).toContain("TypeScript Generics");
  });

  it("returns null for a navigation-only page", () => {
    document.body.innerHTML = `
      <nav><a href="/">Home</a><a href="/about">About</a></nav>
    `;
    const result = detectArticle();
    expect(result).toBeNull();
  });

  it("detects article in Medium-style layout", () => {
    document.body.innerHTML = `
      <header><nav>Medium</nav></header>
      <main>
        <article>
          <h1>A Deep Dive into WebAssembly</h1>
          <p>WebAssembly, often abbreviated as Wasm, is a binary instruction format for a stack-based virtual machine. Wasm is designed as a portable compilation target for programming languages, enabling deployment on the web for client and server applications.</p>
          <p>The main goal of WebAssembly is to enable high-performance applications on the web. It allows developers to compile code written in languages like C, C++, and Rust to run in the browser at near-native speed.</p>
          <p>Unlike JavaScript, which is interpreted or just-in-time compiled, WebAssembly code is pre-compiled to a binary format. This means it can be parsed and executed much faster than equivalent JavaScript code, especially for compute-intensive tasks.</p>
          <p>One of the key advantages of WebAssembly is its safety model. It runs in a sandboxed execution environment, preventing access to the host system outside of explicit and declared permissions. This makes it a secure choice for running untrusted code.</p>
        </article>
      </main>
      <footer>© 2024</footer>
    `;
    const result = detectArticle();
    expect(result).not.toBeNull();
    expect(result!.isArticle).toBe(true);
  });

  it("includes contentHTML in the result", () => {
    document.body.innerHTML = `
      <header><nav>Home</nav></header>
      <main>
        <article>
          <h1>Test Article</h1>
          <p>This is a test article with enough content to be detected as an article. The content needs to be substantial enough for the readability algorithm to identify it as the main content of the page.</p>
          <p>Furthermore, having multiple paragraphs helps the detection algorithm understand that this is indeed article content rather than just random text snippets on a page.</p>
        </article>
      </main>
    `;
    const result = detectArticle();
    expect(result).not.toBeNull();
    expect(result!.contentHTML).toBeTruthy();
    expect(result!.contentHTML.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/article-detector.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/content/article-detector.ts
import { Readability } from "@mozilla/readability";

export type ArticleInfo = {
  title: string;
  contentHTML: string;
  isArticle: boolean;
};

export function detectArticle(): ArticleInfo | null {
  const clonedDoc = document.cloneNode(true) as Document;
  const reader = new Readability(clonedDoc);
  const article = reader.parse();

  if (!article || !article.content) {
    return null;
  }

  return {
    title: article.title,
    contentHTML: article.content,
    isArticle: true,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/article-detector.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/article-detector.ts tests/unit/article-detector.test.ts
git commit -m "feat: add article-detector module using Readability.js"
```

---

### Task 3: Add article-scoped segment extraction

This is the core DOM mapping logic. Before calling Readability, we mark all text nodes in the original document with `data-wpt-rid` IDs. Readability's output preserves these attributes. We then extract segments only from the Readability content, using the `data-wpt-rid` IDs to map back to original DOM nodes.

Note: `contentHTML` comes from Readability's sanitized output, so it's safe to parse via DOMParser.

**Files:**
- Modify: `src/content/dom-extractor.ts`
- Test: `tests/unit/dom-extractor-article.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/unit/dom-extractor-article.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { extractArticleSegments } from "../../src/content/dom-extractor";

describe("extractArticleSegments", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("only extracts segments within article content, ignoring sidebar", () => {
    document.body.innerHTML = `
      <nav>Home About Contact</nav>
      <main>
        <article>
          <h1>Article Title</h1>
          <p>First paragraph of the article with enough text.</p>
          <p>Second paragraph of the article with more text.</p>
        </article>
      </main>
      <aside>
        <h3>Sidebar Heading</h3>
        <p>Sidebar content should be ignored</p>
      </aside>
      <footer>Footer text here</footer>
    `;

    // Simulate Readability output: only the article content
    const contentHTML = document.querySelector("article")!.outerHTML;
    const segments = extractArticleSegments(contentHTML);

    const texts = segments.map((s) => s.text);
    expect(texts).toContain("Article Title");
    expect(texts).toContain("First paragraph of the article with enough text.");
    expect(texts).toContain("Second paragraph of the article with more text.");
    // Sidebar and footer should NOT be included
    expect(texts.some((t) => t.includes("Sidebar"))).toBe(false);
    expect(texts.some((t) => t.includes("Footer"))).toBe(false);
  });

  it("segments reference original DOM nodes via data-wpt-rid", () => {
    document.body.innerHTML = `
      <article>
        <p>Hello world</p>
      </article>
    `;

    const contentHTML = document.querySelector("article")!.outerHTML;
    const segments = extractArticleSegments(contentHTML);

    expect(segments).toHaveLength(1);
    expect(segments[0].element).toBeTruthy();
    expect(segments[0].element!.getAttribute("data-wpt-rid")).toBeTruthy();
    // The element should be the original DOM node, not a clone
    expect(document.body.contains(segments[0].element!)).toBe(true);
  });

  it("marks text nodes with data-wpt-rid before extraction", () => {
    document.body.innerHTML = `
      <article>
        <p>Content here</p>
      </article>
    `;

    const contentHTML = document.querySelector("article")!.outerHTML;
    extractArticleSegments(contentHTML);

    // Original DOM should have data-wpt-rid markers
    const p = document.querySelector("p")!;
    expect(p.hasAttribute("data-wpt-rid")).toBe(true);
  });

  it("returns empty array for empty contentHTML", () => {
    document.body.innerHTML = "<p>Some content</p>";
    const segments = extractArticleSegments("<div></div>");
    expect(segments).toHaveLength(0);
  });

  it("skips code and pre blocks within article content", () => {
    document.body.innerHTML = `
      <article>
        <p>Normal text paragraph</p>
        <code>var x = 1;</code>
        <pre>code block content</pre>
        <p>Another normal paragraph</p>
      </article>
    `;

    const contentHTML = document.querySelector("article")!.outerHTML;
    const segments = extractArticleSegments(contentHTML);

    const texts = segments.map((s) => s.text);
    expect(texts).toContain("Normal text paragraph");
    expect(texts).toContain("Another normal paragraph");
    expect(texts.some((t) => t.includes("var x"))).toBe(false);
    expect(texts.some((t) => t.includes("code block"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/dom-extractor-article.test.ts`
Expected: FAIL — `extractArticleSegments` is not exported

- [ ] **Step 3: Add `extractArticleSegments` and `markDocumentNodes` to dom-extractor.ts**

Add the following to the end of `src/content/dom-extractor.ts`:

```typescript
let ridCounter = 0;

export function markDocumentNodes(): void {
  ridCounter = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();

  while (current) {
    const textNode = current as Text;
    const parent = textNode.parentElement;
    current = walker.nextNode();

    if (!parent) continue;
    const text = textNode.nodeValue?.trim() ?? "";
    if (!text || text.length < 2) continue;

    const id = `wpt-rid-${ridCounter++}`;
    parent.setAttribute("data-wpt-rid", id);
  }
}

export function extractArticleSegments(contentHTML: string): Segment[] {
  // contentHTML comes from Readability's sanitized output, safe to parse
  const parser = new DOMParser();
  const doc = parser.parseFromString(contentHTML, "text/html");
  const container = doc.body;

  const result: Segment[] = [];
  let idx = 0;
  const appendedElementsInPass = new WeakSet<Element>();
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();

  while (current) {
    const textNode = current as Text;
    const parent = textNode.parentElement;
    current = walker.nextNode();

    if (!parent) continue;
    if (parent.closest(SKIP_SELECTORS)) continue;

    const text = textNode.nodeValue?.trim() ?? "";
    if (!text || text.length < 2) continue;

    // Map back to original DOM via data-wpt-rid marker
    const rid = parent.getAttribute("data-wpt-rid");
    const originalElement = rid ? document.querySelector(`[data-wpt-rid="${rid}"]`) as Element | null : null;
    if (!originalElement) continue;

    const appendContainer = findAppendContainer(parent);
    if (appendContainer) {
      const appendRid = appendContainer.getAttribute("data-wpt-rid");
      const originalAppend = appendRid ? document.querySelector(`[data-wpt-rid="${appendRid}"]`) as Element | null : null;

      if (!originalAppend || translatedElements.has(originalAppend) || appendedElementsInPass.has(originalAppend)) {
        continue;
      }

      const blockText = appendContainer.textContent?.trim() ?? "";
      if (blockText.length >= 2) {
        result.push({
          segmentId: `wpt-seg-${idx}`,
          text: blockText,
          xpath: getXPath(originalAppend),
          order: idx,
          element: originalAppend,
          renderMode: "append"
        });
        idx++;
        appendedElementsInPass.add(originalAppend);
      }
      continue;
    }

    result.push({
      segmentId: `wpt-seg-${idx}`,
      text,
      xpath: getTextNodeXPath(textNode),
      order: idx,
      element: originalElement,
      renderMode: "replace"
    });
    idx++;
  }

  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/dom-extractor-article.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Run all existing dom-extractor tests to verify no regressions**

Run: `pnpm vitest run tests/unit/dom-extractor.test.ts`
Expected: All existing tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/content/dom-extractor.ts tests/unit/dom-extractor-article.test.ts
git commit -m "feat: add article-scoped segment extraction with DOM node mapping"
```

---

### Task 4: Integrate article detection into page translation flow

**Files:**
- Modify: `src/content/index.ts`
- Test: `tests/integration/content-flow-article.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/integration/content-flow-article.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock chrome.runtime.sendMessage for translation
vi.stubGlobal("chrome", {
  runtime: {
    sendMessage: vi.fn().mockResolvedValue({
      success: true,
      data: {
        results: [{ status: "ok", text: "翻译结果" }],
      },
    }),
    getURL: vi.fn((path: string) => path),
  },
  storage: {
    local: {
      get: vi.fn((keys, callback) => callback({})),
      set: vi.fn((data, callback) => callback?.()),
    },
  },
});

import { runPageTranslationFlow } from "../../src/content/index";

describe("content flow with article detection", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.resetModules();
  });

  it("translates only article content when page is an article", async () => {
    document.body.innerHTML = `
      <header><nav>Home About</nav></header>
      <main>
        <article>
          <h1>Understanding TypeScript Generics</h1>
          <p>TypeScript generics allow you to create reusable components that work with a variety of types rather than a single one. This enables developers to write flexible, type-safe code.</p>
          <p>Another paragraph of article content that adds more substance to the article.</p>
        </article>
      </main>
      <aside><h3>Related</h3><p>This is sidebar content</p></aside>
      <footer>© 2024</footer>
    `;

    const result = await runPageTranslationFlow();

    // Should detect article and only translate article segments
    // Navigation, sidebar, and footer should NOT have translations
    const nav = document.querySelector("nav")!;
    const aside = document.querySelector("aside")!;
    const footer = document.querySelector("footer")!;

    // No translation blocks should be appended to nav, aside, or footer
    expect(nav.querySelector('[class*="wpt"]')).toBeNull();
    expect(aside.querySelector('[class*="wpt"]')).toBeNull();
    expect(footer.querySelector('[class*="wpt"]')).toBeNull();

    // Article content should have translations
    const article = document.querySelector("article")!;
    expect(article.querySelectorAll('[class*="wpt"]').length).toBeGreaterThan(0);

    // Total should be less than if we translated everything
    expect(result.total).toBeLessThanOrEqual(3); // title + 2 paragraphs
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/integration/content-flow-article.test.ts`
Expected: FAIL (current implementation translates all content)

- [ ] **Step 3: Modify `runPageTranslationFlow` in `src/content/index.ts`**

Add the import at the top of the file (with the other imports):
```typescript
import { detectArticle } from "./article-detector";
import { extractArticleSegments, markDocumentNodes } from "./dom-extractor";
```

Replace the segment extraction part of `runPageTranslationFlow` — find this line in the function body:

```typescript
    segments = extractSegments();
```

Replace it with:

```typescript
    const article = detectArticle();
    if (article) {
      markDocumentNodes();
      segments = extractArticleSegments(article.contentHTML);
    } else {
      segments = extractSegments();
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/integration/content-flow-article.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Run all existing tests to verify no regressions**

Run: `pnpm test`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/content/index.ts tests/integration/content-flow-article.test.ts
git commit -m "feat: integrate article detection into page translation flow"
```

---

### Task 5: Clean up and verify

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests PASS

- [ ] **Step 2: Run build**

Run: `pnpm build`
Expected: Build succeeds, no errors

- [ ] **Step 3: Verify bundle includes Readability**

Run: `pnpm build && grep -c "Readability" dist/*.js`
Expected: Readability code is present in the built output
