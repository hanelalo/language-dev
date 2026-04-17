# Tooltip Smart Positioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the selection translation tooltip intelligently position itself near the selected text without covering it.

**Architecture:** Add a `computeTooltipPosition` function that evaluates 4 candidate positions (top/bottom/left/right of the selection) and picks the closest one that fits within the viewport. The tooltip is first rendered hidden, measured, then repositioned.

**Tech Stack:** TypeScript, Chrome Extension (Manifest V3), Vitest, @testing-library/dom

---

### Task 1: Add unit tests for `computeTooltipPosition`

**Files:**
- Modify: `tests/unit/selection-translate.test.ts`

- [ ] **Step 1: Add tests for `computeTooltipPosition`**

Add the following tests to `tests/unit/selection-translate.test.ts`. These tests will fail initially since `computeTooltipPosition` doesn't exist yet.

```typescript
import { describe, expect, it } from "vitest";
import { buildSelectionTooltip } from "../../src/content/selection-translate";
import { computeTooltipPosition } from "../../src/content/index";

describe("buildSelectionTooltip", () => {
  it("includes translated text", () => {
    const html = buildSelectionTooltip("hello", "你好");
    expect(html).toContain("你好");
  });
});

function makeTooltip(w: number, h: number): HTMLElement {
  const el = document.createElement("div");
  Object.defineProperty(el, "offsetWidth", { value: w, configurable: true });
  Object.defineProperty(el, "offsetHeight", { value: h, configurable: true });
  return el;
}

function makeRect(left: number, top: number, width: number, height: number): DOMRect {
  return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top } as DOMRect;
}

describe("computeTooltipPosition", () => {
  it("positions tooltip above selection when there is room", () => {
    // Viewport 1000x800, selection centered at (400,400), tooltip 200x100
    Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });

    const tooltip = makeTooltip(200, 100);
    const rect = makeRect(400, 400, 80, 20); // selection at (400,400)

    const pos = computeTooltipPosition(tooltip, rect);

    // Above: top = 400 - 100 - 8 = 292, left = 440 - 100 = 340
    expect(pos.top).toBe(292);
    expect(pos.left).toBe(340);
  });

  it("positions tooltip below selection when above has no room", () => {
    Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });

    const tooltip = makeTooltip(200, 100);
    const rect = makeRect(400, 10, 80, 20); // selection near top of viewport

    const pos = computeTooltipPosition(tooltip, rect);

    // Above would be top = 10 - 100 - 8 = -98 (invalid), falls back to below
    // Below: top = 30 + 8 = 38
    expect(pos.top).toBe(38);
  });

  it("positions tooltip to the right when above and below have no room", () => {
    Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });

    const tooltip = makeTooltip(200, 600);
    const rect = makeRect(400, 80, 80, 20); // selection near top, tooltip too tall for above/below

    const pos = computeTooltipPosition(tooltip, rect);

    // Above: 80 - 600 - 8 = -528 (invalid)
    // Below: 100 + 8 = 108, but 108 + 600 = 708 < 800, so below actually fits
    // Expect below to be chosen as it's closer than right
    expect(pos.top).toBe(108);
  });

  it("clamps tooltip left edge when it would overflow left", () => {
    Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });

    const tooltip = makeTooltip(200, 100);
    const rect = makeRect(20, 400, 80, 20); // selection near left edge

    const pos = computeTooltipPosition(tooltip, rect);

    // Above: left = 60 - 100 = -40, clamped to 8
    expect(pos.left).toBe(8);
    expect(pos.top).toBe(292);
  });

  it("picks closest valid position when multiple options exist", () => {
    Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });

    const tooltip = makeTooltip(200, 100);
    const rect = makeRect(400, 100, 80, 20);

    const pos = computeTooltipPosition(tooltip, rect);

    // Above: top = 100 - 100 - 8 = -8 (invalid, < 8 pad)
    // Below: top = 120 + 8 = 128, left = 440 - 100 = 340
    expect(pos.top).toBe(128);
    expect(pos.left).toBe(340);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test tests/unit/selection-translate.test.ts`
Expected: FAIL — `computeTooltipPosition` is not exported from `src/content/index.ts`

- [ ] **Step 3: Commit test file**

```bash
git add tests/unit/selection-translate.test.ts
git commit -m "test: add unit tests for tooltip smart positioning"
```

---

### Task 2: Implement `computeTooltipPosition`

**Files:**
- Modify: `src/content/index.ts` (add function before `showSelectionTooltip`, export it)

- [ ] **Step 1: Add `computeTooltipPosition` function**

Insert this function before `showSelectionTooltip` (before line 55). The project already has a `clamp` helper at line 596, so reuse it.

```typescript
const TOOLTIP_POSITION_GAP = 8;

export function computeTooltipPosition(
  tooltip: HTMLElement,
  selectionRect: DOMRect
): { left: number; top: number } {
  const tw = tooltip.offsetWidth;
  const th = tooltip.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pad = TOOLTIP_POSITION_GAP;

  const cx = selectionRect.left + selectionRect.width / 2;
  const cy = selectionRect.top + selectionRect.height / 2;

  type Candidate = { left: number; top: number; dist: number };
  const candidates: Candidate[] = [];

  // 上方：tooltip 水平居中，底部贴选词顶部上方
  const leftTop = clamp(cx - tw / 2, pad, vw - tw - pad);
  const topAbove = selectionRect.top - th - pad;
  candidates.push({
    left: leftTop,
    top: topAbove,
    dist: Math.hypot(leftTop + tw / 2 - cx, topAbove + th - selectionRect.top),
  });

  // 下方：tooltip 水平居中，顶部贴选词底部下方
  const leftBot = clamp(cx - tw / 2, pad, vw - tw - pad);
  const topBelow = selectionRect.bottom + pad;
  candidates.push({
    left: leftBot,
    top: topBelow,
    dist: Math.hypot(leftBot + tw / 2 - cx, topBelow - selectionRect.bottom),
  });

  // 左侧：tooltip 垂直居中，右侧贴选词左侧左方
  const topLeft = clamp(cy - th / 2, pad, vh - th - pad);
  const leftLeft = selectionRect.left - tw - pad;
  candidates.push({
    left: leftLeft,
    top: topLeft,
    dist: Math.hypot(leftLeft + tw - selectionRect.left, topLeft + th / 2 - cy),
  });

  // 右侧：tooltip 垂直居中，左侧贴选词右侧右方
  const topRight = clamp(cy - th / 2, pad, vh - th - pad);
  const leftRight = selectionRect.right + pad;
  candidates.push({
    left: leftRight,
    top: topRight,
    dist: Math.hypot(leftRight - selectionRect.right, topRight + th / 2 - cy),
  });

  // 过滤完全在视口内的候选位置
  const valid = candidates.filter(
    (c) =>
      c.left >= pad &&
      c.top >= pad &&
      c.left + tw <= vw - pad &&
      c.top + th <= vh - pad
  );

  // 优先选距离最近的有效位置；无有效位置时退化为选最近的（宁可溢出不遮挡选词）
  const pool = valid.length > 0 ? valid : candidates;
  pool.sort((a, b) => a.dist - b.dist);
  return { left: pool[0].left, top: pool[0].top };
}
```

Note: The `clamp` function already exists at line 596 in this file, so it's available without any changes.

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm test tests/unit/selection-translate.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/content/index.ts
git commit -m "feat: add computeTooltipPosition for smart tooltip placement"
```

---

### Task 3: Update `showSelectionTooltip` to use smart positioning

**Files:**
- Modify: `src/content/index.ts` (lines 55-177)

- [ ] **Step 1: Change `showSelectionTooltip` signature and add smart positioning**

Change the function signature from `(x: number, y: number, source: string, ...)` to `(selectionRect: DOMRect, source: string, ...)`.

Replace the initial style block (lines 65-78):

```typescript
  tooltip.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    visibility: hidden;
    background: ${TOOLTIP_COLORS.card};
    border: 1px solid ${TOOLTIP_COLORS.border};
    border-radius: 8px;
    padding: 12px 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    max-width: 300px;
  `;
```

After `document.body.appendChild(tooltip);` (line 150), before `selectionTooltip = tooltip;` (line 151), add positioning logic:

```typescript
  const { left, top } = computeTooltipPosition(tooltip, selectionRect);
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.style.visibility = "visible";
```

Also update the `doTranslate` call in the click handler (line 126) from `doTranslate(source, x, y, tooltip, ...)` to `doTranslate(source, tooltip, ...)`.

Full updated `showSelectionTooltip` function body for the changed parts:

```typescript
function showSelectionTooltip(selectionRect: DOMRect, source: string, translated?: string, loading = false): void {
  // 防止重复创建：如果已有 tooltip 或正在创建中，直接返回
  if (isCreatingTooltip || selectionTooltip) {
    return;
  }
  isCreatingTooltip = true;

  const tooltip = document.createElement("div");
  tooltip.className = "wpt-selection-tooltip";
  tooltip.id = "wpt-selection-tooltip";
  tooltip.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    visibility: hidden;
    background: ${TOOLTIP_COLORS.card};
    border: 1px solid ${TOOLTIP_COLORS.border};
    border-radius: 8px;
    padding: 12px 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    max-width: 300px;
  `;
```

... (middle of function unchanged) ...

```typescript
  tooltip.appendChild(sourceDiv);
  tooltip.appendChild(translatedDiv);
  tooltip.appendChild(footer);
  document.body.appendChild(tooltip);

  // 智能定位：计算最佳位置并显示
  const { left, top } = computeTooltipPosition(tooltip, selectionRect);
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.style.visibility = "visible";

  selectionTooltip = tooltip;
```

... (rest of function unchanged, except the doTranslate call) ...

```typescript
      btn.textContent = "翻译";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        doTranslate(source, tooltip, sourceDiv, translatedDiv, btn);
      });
```

- [ ] **Step 2: Update `handleSelectionTranslate` call site**

Change line 285 from:
```typescript
  showSelectionTooltip(rect.left, rect.top, selectedText);
```
to:
```typescript
  showSelectionTooltip(rect, selectedText);
```

- [ ] **Step 3: Update `doTranslate` signature — remove unused `x, y` parameters**

Change the function signature (line 179) from:
```typescript
async function doTranslate(
  source: string,
  x: number,
  y: number,
  tooltip: HTMLElement,
  sourceDiv: HTMLDivElement,
  translatedDiv: HTMLDivElement,
  btn: HTMLButtonElement
): Promise<void> {
```
to:
```typescript
async function doTranslate(
  source: string,
  tooltip: HTMLElement,
  sourceDiv: HTMLDivElement,
  translatedDiv: HTMLDivElement,
  btn: HTMLButtonElement
): Promise<void> {
```

Update both recursive `doTranslate` calls inside the function (lines 233 and 248) from `doTranslate(source, x, y, tooltip, sourceDiv, translatedDiv, btn)` to `doTranslate(source, tooltip, sourceDiv, translatedDiv, btn)`.

- [ ] **Step 4: Run tests**

Run: `pnpm test`
Expected: All tests PASS

- [ ] **Step 5: Build to verify no type errors**

Run: `pnpm build`
Expected: Build succeeds with no errors

- [ ] **Step 6: Commit**

```bash
git add src/content/index.ts
git commit -m "feat: apply smart positioning to selection tooltip"
```

---

### Task 4: Verify full test suite and build

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests PASS

- [ ] **Step 2: Run build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Manual smoke test**

Load the extension in Chrome, open any web page, select a word, and verify:
- Tooltip appears near the selected word but does NOT cover it
- Tooltip positions above when there is room above
- Tooltip positions below when near the top of the viewport
- Tooltip repositions correctly at left/right viewport edges
