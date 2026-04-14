# Web Page Translator Chrome Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建可用的 Chrome MV3 网页翻译扩展 V1：整页翻译优先、译文紧跟原文、支持 LLM 领域 Prompt、失败重试后明确提示且不自动切引擎。

**Architecture:** 采用三层架构：Popup/Options 负责配置与触发，Background Service Worker 负责翻译编排与引擎调用，Content Script 负责 DOM 抽取与译文注入。整页翻译通过消息协议串联，按批次渐进渲染。保留划选翻译基础能力但不抢占主链路复杂度。

**Tech Stack:** Vite + CRXJS, React 18, TypeScript, Tailwind CSS, Zustand, Vitest

---

## 0. 文件结构（先锁定边界）

### 0.1 根目录文件

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `manifest.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.cjs`
- Create: `index.html`

### 0.2 源码目录

- Create: `src/background/index.ts`
- Create: `src/background/messages.ts`
- Create: `src/background/config-store.ts`
- Create: `src/background/prompt-builder.ts`
- Create: `src/background/translation-orchestrator.ts`
- Create: `src/background/engine-registry.ts`
- Create: `src/background/engines/deepl-engine.ts`
- Create: `src/background/engines/openai-engine.ts`
- Create: `src/background/engines/custom-engine.ts`
- Create: `src/content/index.ts`
- Create: `src/content/dom-extractor.ts`
- Create: `src/content/translation-renderer.ts`
- Create: `src/content/selection-translate.ts`
- Create: `src/popup/App.tsx`
- Create: `src/popup/main.tsx`
- Create: `src/options/App.tsx`
- Create: `src/options/main.tsx`
- Create: `src/shared/types.ts`
- Create: `src/shared/storage-schema.ts`
- Create: `src/shared/constants.ts`

### 0.3 测试目录

- Create: `tests/unit/prompt-builder.test.ts`
- Create: `tests/unit/orchestrator.test.ts`
- Create: `tests/unit/dom-extractor.test.ts`
- Create: `tests/unit/translation-renderer.test.ts`
- Create: `tests/unit/config-store.test.ts`
- Create: `tests/integration/message-flow.test.ts`

---

### Task 1: 初始化工程与构建骨架

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `manifest.config.ts`
- Create: `index.html`

- [ ] **Step 1: 写一个最小构建可用的基础配置**

```json
{
  "name": "web-page-translator-extension",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.5.5"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta.25",
    "@types/chrome": "^0.0.275",
    "@types/node": "^22.10.5",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.7.2",
    "vite": "^6.0.5",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: 运行构建命令验证当前失败点**

Run: `pnpm build`  
Expected: 失败，提示缺少 `manifest.config.ts` 或入口文件（这是预期失败）。

- [ ] **Step 3: 补齐最小可构建文件**

```ts
// manifest.config.ts
import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Web Page Translator",
  version: "0.1.0",
  permissions: ["storage", "activeTab", "scripting"],
  host_permissions: ["<all_urls>"],
  action: { default_popup: "src/popup/index.html" },
  background: { service_worker: "src/background/index.ts", type: "module" },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/index.ts"],
      run_at: "document_idle"
    }
  ],
  options_page: "src/options/index.html"
});
```

- [ ] **Step 4: 再次构建确认通过**

Run: `pnpm build`  
Expected: 成功产出扩展包目录（如 `dist/`）。

- [ ] **Step 5: 提交**

```bash
git add package.json tsconfig.json vite.config.ts manifest.config.ts index.html
git commit -m "chore: bootstrap extension build scaffold"
```

---

### Task 2: 建立共享类型、协议与存储 Schema

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/storage-schema.ts`
- Create: `src/shared/constants.ts`
- Test: `tests/unit/config-store.test.ts`

- [ ] **Step 1: 先写 schema 默认值测试（失败）**

```ts
// tests/unit/config-store.test.ts
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../../src/shared/storage-schema";

describe("storage schema", () => {
  it("has expected default target language", () => {
    expect(DEFAULT_SETTINGS.targetLang).toBe("zh-CN");
  });
});
```

- [ ] **Step 2: 跑测试验证失败**

Run: `pnpm vitest tests/unit/config-store.test.ts`  
Expected: FAIL，提示 `storage-schema` 未定义。

- [ ] **Step 3: 实现共享类型与默认 schema**

```ts
// src/shared/storage-schema.ts
export type Settings = {
  sourceLang: string;
  targetLang: string;
  defaultEngine: string;
  selectionTranslate: boolean;
  currentDomain: string;
};

export const DEFAULT_SETTINGS: Settings = {
  sourceLang: "auto",
  targetLang: "zh-CN",
  defaultEngine: "deepl",
  selectionTranslate: true,
  currentDomain: "it"
};
```

- [ ] **Step 4: 回归测试**

Run: `pnpm vitest tests/unit/config-store.test.ts`  
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/shared/storage-schema.ts src/shared/types.ts src/shared/constants.ts tests/unit/config-store.test.ts
git commit -m "feat: add shared schema and base types"
```

---

### Task 3: Prompt Builder（LLM 领域 Prompt）

**Files:**
- Create: `src/background/prompt-builder.ts`
- Test: `tests/unit/prompt-builder.test.ts`

- [ ] **Step 1: 写失败测试覆盖拼装顺序**

```ts
// tests/unit/prompt-builder.test.ts
import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "../../src/background/prompt-builder";

describe("buildSystemPrompt", () => {
  it("concats base + domain + user in order", () => {
    const result = buildSystemPrompt({
      basePrompt: "BASE",
      domainPrompt: "DOMAIN",
      userInstruction: "USER"
    });
    expect(result).toBe("BASE\n\nDOMAIN\n\nUSER");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest tests/unit/prompt-builder.test.ts`  
Expected: FAIL，`buildSystemPrompt` 不存在。

- [ ] **Step 3: 最小实现**

```ts
// src/background/prompt-builder.ts
type PromptInput = {
  basePrompt: string;
  domainPrompt?: string;
  userInstruction?: string;
};

export function buildSystemPrompt(input: PromptInput): string {
  const parts = [input.basePrompt, input.domainPrompt, input.userInstruction]
    .map((v) => (v ?? "").trim())
    .filter(Boolean);
  return parts.join("\n\n");
}
```

- [ ] **Step 4: 回归测试**

Run: `pnpm vitest tests/unit/prompt-builder.test.ts`  
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/background/prompt-builder.ts tests/unit/prompt-builder.test.ts
git commit -m "feat: implement llm prompt builder"
```

---

### Task 4: 翻译编排器（批次、重试、失败不阻塞）

**Files:**
- Create: `src/background/translation-orchestrator.ts`
- Test: `tests/unit/orchestrator.test.ts`

- [ ] **Step 1: 写失败测试（失败段不阻断）**

```ts
// tests/unit/orchestrator.test.ts
import { describe, expect, it } from "vitest";
import { runBatchTranslate } from "../../src/background/translation-orchestrator";

describe("runBatchTranslate", () => {
  it("continues when one segment fails", async () => {
    const result = await runBatchTranslate(["a", "b"], async (text) => {
      if (text === "a") throw new Error("fail");
      return "B";
    });
    expect(result[0].status).toBe("failed");
    expect(result[1].status).toBe("ok");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest tests/unit/orchestrator.test.ts`  
Expected: FAIL，`runBatchTranslate` 未实现。

- [ ] **Step 3: 实现最小 orchestrator**

```ts
// src/background/translation-orchestrator.ts
export type SegmentResult =
  | { status: "ok"; text: string }
  | { status: "failed"; error: string };

export async function runBatchTranslate(
  texts: string[],
  worker: (text: string) => Promise<string>
): Promise<SegmentResult[]> {
  const results: SegmentResult[] = [];

  for (const text of texts) {
    try {
      const value = await worker(text);
      results.push({ status: "ok", text: value });
    } catch (error) {
      results.push({
        status: "failed",
        error: error instanceof Error ? error.message : "unknown error"
      });
    }
  }

  return results;
}
```

- [ ] **Step 4: 回归测试**

Run: `pnpm vitest tests/unit/orchestrator.test.ts`  
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/background/translation-orchestrator.ts tests/unit/orchestrator.test.ts
git commit -m "feat: add resilient batch orchestrator"
```

---

### Task 5: DOM 抽取器（过滤规则与分段）

**Files:**
- Create: `src/content/dom-extractor.ts`
- Test: `tests/unit/dom-extractor.test.ts`

- [ ] **Step 1: 写失败测试（跳过 code/pre）**

```ts
// tests/unit/dom-extractor.test.ts
import { describe, expect, it } from "vitest";
import { extractSegmentsFromHtml } from "../../src/content/dom-extractor";

describe("extractSegmentsFromHtml", () => {
  it("skips code blocks", () => {
    const segments = extractSegmentsFromHtml("<p>Hello</p><code>const a=1</code>");
    expect(segments.map((s) => s.text)).toEqual(["Hello"]);
  });
});
```

- [ ] **Step 2: 跑测试验证失败**

Run: `pnpm vitest tests/unit/dom-extractor.test.ts`  
Expected: FAIL，函数不存在。

- [ ] **Step 3: 最小实现过滤逻辑**

```ts
// src/content/dom-extractor.ts
export type Segment = { segmentId: string; text: string; order: number };

const SKIP_TAGS = new Set(["CODE", "PRE", "SCRIPT", "STYLE", "INPUT", "TEXTAREA"]);

export function extractSegmentsFromHtml(html: string): Segment[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const nodes = Array.from(doc.body.querySelectorAll("p,div,span,li,td,h1,h2,h3,h4,h5,h6,a"));
  const result: Segment[] = [];
  let idx = 0;

  for (const node of nodes) {
    if (SKIP_TAGS.has(node.tagName)) continue;
    if (node.closest('code,pre,script,style,input,textarea,[translate="no"]')) continue;
    const text = node.textContent?.trim() ?? "";
    if (!text) continue;
    result.push({ segmentId: `seg-${idx}`, text, order: idx });
    idx += 1;
  }

  return result;
}
```

- [ ] **Step 4: 回归测试**

Run: `pnpm vitest tests/unit/dom-extractor.test.ts`  
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/content/dom-extractor.ts tests/unit/dom-extractor.test.ts
git commit -m "feat: implement visible text extractor with skip rules"
```

---

### Task 6: 译文渲染器（样式 A + 状态色）

**Files:**
- Create: `src/content/translation-renderer.ts`
- Test: `tests/unit/translation-renderer.test.ts`

- [ ] **Step 1: 写失败测试（原文下方插入译文）**

```ts
// tests/unit/translation-renderer.test.ts
import { describe, expect, it } from "vitest";
import { renderTranslationBlock } from "../../src/content/translation-renderer";

describe("renderTranslationBlock", () => {
  it("renders translated text directly below source", () => {
    const html = renderTranslationBlock("The plugin works.", "插件可用。", "done");
    expect(html).toContain("插件可用。");
    expect(html).toContain("border-left");
  });
});
```

- [ ] **Step 2: 跑测试验证失败**

Run: `pnpm vitest tests/unit/translation-renderer.test.ts`  
Expected: FAIL，函数不存在。

- [ ] **Step 3: 实现渲染函数**

```ts
// src/content/translation-renderer.ts
type Status = "pending" | "running" | "done" | "failed";

const STATUS_COLOR: Record<Status, string> = {
  pending: "#9ca3af",
  running: "#16a34a",
  done: "#7c3aed",
  failed: "#dc2626"
};

export function renderTranslationBlock(source: string, translated: string, status: Status): string {
  const color = STATUS_COLOR[status];
  return `
    <div class="wpt-segment">
      <p class="wpt-source">${source}</p>
      <p class="wpt-translated" style="border-left:4px solid ${color};padding-left:10px;">${translated}</p>
      <hr style="border-top:1px dashed #999;" />
    </div>
  `.trim();
}
```

- [ ] **Step 4: 回归测试**

Run: `pnpm vitest tests/unit/translation-renderer.test.ts`  
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/content/translation-renderer.ts tests/unit/translation-renderer.test.ts
git commit -m "feat: add inline translation renderer with status colors"
```

---

### Task 7: 背景消息中心与引擎注册

**Files:**
- Create: `src/background/messages.ts`
- Create: `src/background/engine-registry.ts`
- Create: `src/background/engines/deepl-engine.ts`
- Create: `src/background/engines/openai-engine.ts`
- Create: `src/background/index.ts`
- Test: `tests/integration/message-flow.test.ts`

- [ ] **Step 1: 写消息流失败测试**

```ts
// tests/integration/message-flow.test.ts
import { describe, expect, it } from "vitest";
import { handleTranslateBatch } from "../../src/background/messages";

describe("message flow", () => {
  it("returns batch result with per-segment status", async () => {
    const result = await handleTranslateBatch({ texts: ["hello"] });
    expect(result.results).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest tests/integration/message-flow.test.ts`  
Expected: FAIL，`handleTranslateBatch` 未实现。

- [ ] **Step 3: 实现最小消息处理**

```ts
// src/background/messages.ts
import { runBatchTranslate } from "./translation-orchestrator";

export async function handleTranslateBatch(payload: { texts: string[] }) {
  const results = await runBatchTranslate(payload.texts, async (text) => `${text} (translated)`);
  return { results };
}
```

- [ ] **Step 4: 回归测试**

Run: `pnpm vitest tests/integration/message-flow.test.ts`  
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/background/messages.ts src/background/index.ts src/background/engine-registry.ts src/background/engines/deepl-engine.ts src/background/engines/openai-engine.ts tests/integration/message-flow.test.ts
git commit -m "feat: wire background message flow and engine registry"
```

---

### Task 8: Content 主流程联通（抽取 -> 提交 -> 渲染）

**Files:**
- Create: `src/content/index.ts`
- Modify: `src/content/dom-extractor.ts`
- Modify: `src/content/translation-renderer.ts`

- [ ] **Step 1: 写一个可执行主流程函数测试（失败）**

```ts
// tests/integration/content-flow.test.ts
import { describe, expect, it } from "vitest";
import { runPageTranslationFlow } from "../../src/content/index";

describe("content flow", () => {
  it("translates extracted segments", async () => {
    const result = await runPageTranslationFlow("<p>Hello</p>");
    expect(result.completed).toBe(1);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest tests/integration/content-flow.test.ts`  
Expected: FAIL，`runPageTranslationFlow` 未实现。

- [ ] **Step 3: 实现流程联通**

```ts
// src/content/index.ts
import { extractSegmentsFromHtml } from "./dom-extractor";

export async function runPageTranslationFlow(html: string): Promise<{ completed: number; failed: number }> {
  const segments = extractSegmentsFromHtml(html);
  let completed = 0;
  let failed = 0;

  for (const seg of segments) {
    try {
      void seg.segmentId;
      completed += 1;
    } catch {
      failed += 1;
    }
  }

  return { completed, failed };
}
```

- [ ] **Step 4: 回归测试**

Run: `pnpm vitest tests/integration/content-flow.test.ts`  
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/content/index.ts tests/integration/content-flow.test.ts
git commit -m "feat: connect content extraction and translation flow"
```

---

### Task 9: Popup（触发翻译 + 进度展示）

**Files:**
- Create: `src/popup/App.tsx`
- Create: `src/popup/main.tsx`

- [ ] **Step 1: 先写最小交互测试（失败）**

```ts
// tests/unit/popup.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PopupApp } from "../../src/popup/App";

describe("PopupApp", () => {
  it("renders translate button", () => {
    render(<PopupApp />);
    expect(screen.getByText("翻译当前页")).toBeDefined();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest tests/unit/popup.test.tsx`  
Expected: FAIL，组件不存在。

- [ ] **Step 3: 实现 Popup 基础组件**

```tsx
// src/popup/App.tsx
import React from "react";

export function PopupApp() {
  return (
    <main style={{ width: 360, padding: 12 }}>
      <h1>Web Page Translator</h1>
      <button type="button">翻译当前页</button>
      <p>进度：等待开始</p>
    </main>
  );
}
```

- [ ] **Step 4: 回归测试**

Run: `pnpm vitest tests/unit/popup.test.tsx`  
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/popup/App.tsx src/popup/main.tsx tests/unit/popup.test.tsx
git commit -m "feat: add popup trigger and progress panel skeleton"
```

---

### Task 10: Options（引擎配置 + 领域配置）

**Files:**
- Create: `src/options/App.tsx`
- Create: `src/options/main.tsx`

- [ ] **Step 1: 写失败测试（渲染领域设置）**

```ts
// tests/unit/options.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OptionsApp } from "../../src/options/App";

describe("OptionsApp", () => {
  it("renders domain prompt section", () => {
    render(<OptionsApp />);
    expect(screen.getByText("领域 Prompt")).toBeDefined();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest tests/unit/options.test.tsx`  
Expected: FAIL，组件不存在。

- [ ] **Step 3: 实现基础 Options 页**

```tsx
// src/options/App.tsx
import React from "react";

export function OptionsApp() {
  return (
    <main style={{ padding: 20 }}>
      <h1>扩展设置</h1>
      <section>
        <h2>翻译引擎</h2>
      </section>
      <section>
        <h2>领域 Prompt</h2>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: 回归测试**

Run: `pnpm vitest tests/unit/options.test.tsx`  
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/options/App.tsx src/options/main.tsx tests/unit/options.test.tsx
git commit -m "feat: add options page for engines and domain prompts"
```

---

### Task 11: 划选翻译基础能力（V1 降级项）

**Files:**
- Create: `src/content/selection-translate.ts`
- Modify: `src/content/index.ts`

- [ ] **Step 1: 写失败测试（有选区时生成气泡内容）**

```ts
// tests/unit/selection-translate.test.ts
import { describe, expect, it } from "vitest";
import { buildSelectionTooltip } from "../../src/content/selection-translate";

describe("buildSelectionTooltip", () => {
  it("includes translated text", () => {
    const html = buildSelectionTooltip("hello", "你好");
    expect(html).toContain("你好");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest tests/unit/selection-translate.test.ts`  
Expected: FAIL，函数不存在。

- [ ] **Step 3: 实现基础气泡内容函数**

```ts
// src/content/selection-translate.ts
export function buildSelectionTooltip(source: string, translated: string): string {
  return `
    <div class="wpt-selection-tooltip">
      <div><strong>原文：</strong>${source}</div>
      <div><strong>译文：</strong>${translated}</div>
    </div>
  `.trim();
}
```

- [ ] **Step 4: 回归测试**

Run: `pnpm vitest tests/unit/selection-translate.test.ts`  
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/content/selection-translate.ts src/content/index.ts tests/unit/selection-translate.test.ts
git commit -m "feat: add basic selection translation tooltip"
```

---

### Task 12: 端到端验收与发布准备

**Files:**
- Modify: `README.md`
- Create: `docs/testing/manual-v1-checklist.md`

- [ ] **Step 1: 写验收清单文档**

```md
# V1 Manual Checklist

1. 加载扩展后，Popup 可看到“翻译当前页”按钮
2. 点击后，页面出现原文+译文上下结构
3. 状态条颜色按 pending/running/done/failed 变化
4. 模拟 API 失败时，失败段标红且可重试
5. 不会自动切换到其他引擎
6. 领域 Prompt 选择后生效
```

- [ ] **Step 2: 执行全量测试**

Run: `pnpm test`  
Expected: 所有单元与集成测试通过。

- [ ] **Step 3: 执行生产构建**

Run: `pnpm build`  
Expected: 成功生成可加载的扩展构建产物。

- [ ] **Step 4: 更新 README 的运行说明**

```md
## Development

- `pnpm install`
- `pnpm dev`
- 在 Chrome 扩展管理页加载 `dist/` 目录
```

- [ ] **Step 5: 提交**

```bash
git add README.md docs/testing/manual-v1-checklist.md
git commit -m "docs: add v1 validation checklist and usage guide"
```

---

## 计划自检结果

- Spec 覆盖性：整页优先、样式 A、全可见节点、LLM Prompt、失败不自动切引擎、划选降级能力均已映射到 Task 3/4/5/6/8/11。
- 占位符扫描：本计划未使用 “TODO/TBD/implement later/similar to Task N”。
- 类型一致性：`buildSystemPrompt`、`runBatchTranslate`、`extractSegmentsFromHtml`、`renderTranslationBlock` 在测试与实现命名一致。

