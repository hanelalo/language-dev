# Floating Toggle Fix & Selection Translate Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the floating toggle button robust against removal and add a user-facing toggle for the selection translation feature.

**Architecture:** Two independent changes in `src/content/index.ts` (toggle guard + selection gate) and one UI addition in `src/options/App.tsx`. The MutationObserver watches for button removal and recreates it. The selection toggle reads from `chrome.storage.local` and caches the value with a `chrome.storage.onChanged` listener.

**Tech Stack:** TypeScript, Chrome Extension Manifest V3, Chrome Storage API, MutationObserver API, React (options page), Vitest (tests)

---

### Task 1: Fallback visibility for floating toggle button

**Files:**
- Modify: `src/content/index.ts:486-517` (`ensureFloatingToggle` function, button style section)

- [ ] **Step 1: Change button background from transparent to semi-transparent green**

In `ensureFloatingToggle()`, change line 501:

```typescript
// Before:
btn.style.background = "transparent";

// After:
btn.style.background = "rgba(16, 185, 129, 0.15)";
```

- [ ] **Step 2: Add hover effect to button**

After the `btn.appendChild(img)` line (line 517), before `applySavedPosition(btn)` (line 519), add:

```typescript
btn.addEventListener("mouseenter", () => {
  btn.style.background = "rgba(16, 185, 129, 0.3)";
});
btn.addEventListener("mouseleave", () => {
  btn.style.background = "rgba(16, 185, 129, 0.15)";
});
```

- [ ] **Step 3: Verify the build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/content/index.ts
git commit -m "fix: add fallback background to floating toggle for visibility when icon fails"
```

---

### Task 2: DOMContentLoaded fallback for ensureFloatingToggle

**Files:**
- Modify: `src/content/index.ts:479` (top-level call site)

- [ ] **Step 1: Wrap ensureFloatingToggle call with DOMContentLoaded fallback**

Replace line 479 (`ensureFloatingToggle();`) with:

```typescript
ensureFloatingToggle();
document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById(FLOATING_TOGGLE_ID)) {
    ensureFloatingToggle();
  }
});
```

- [ ] **Step 2: Verify the build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/content/index.ts
git commit -m "fix: add DOMContentLoaded fallback for floating toggle creation"
```

---

### Task 3: MutationObserver guard for floating toggle button

**Files:**
- Modify: `src/content/index.ts` (add observer setup after `ensureFloatingToggle()` at bottom of module)

- [ ] **Step 1: Add MutationObserver guard function**

Add this function after the `ensureFloatingToggle()` function definition (after line 526), before `handleFloatingToggleClick`:

```typescript
let toggleObserver: MutationObserver | null = null;
let recreateTimer: ReturnType<typeof setTimeout> | null = null;

function setupToggleObserver(): void {
  if (toggleObserver) return;
  toggleObserver = new MutationObserver(() => {
    if (document.getElementById(FLOATING_TOGGLE_ID)) return;
    if (recreateTimer) clearTimeout(recreateTimer);
    recreateTimer = setTimeout(() => {
      recreateTimer = null;
      ensureFloatingToggle();
    }, 100);
  });
}

function observeTogglePresence(): void {
  if (!document.body || !toggleObserver) return;
  toggleObserver.observe(document.body, { childList: true });
}
```

- [ ] **Step 2: Call setupToggleObserver and start observing in ensureFloatingToggle**

At the end of `ensureFloatingToggle()`, just before `document.body.appendChild(btn)` (line 525), add:

```typescript
  setupToggleObserver();
```

And just after `document.body.appendChild(btn);` (line 525), add:

```typescript
  observeTogglePresence();
```

- [ ] **Step 3: Verify the build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/content/index.ts
git commit -m "fix: add MutationObserver to recreate floating toggle if removed from DOM"
```

---

### Task 4: Selection translate gate in content script

**Files:**
- Modify: `src/content/index.ts:29-32` (selection state variables) and `src/content/index.ts:474-477` (mouseup handler)

- [ ] **Step 1: Add cached setting variable and storage listeners**

After the `selectionTooltip` and `isCreatingTooltip` declarations (lines 30-32), add:

```typescript
// Cached selection translate setting
let selectionTranslateEnabled = true;
```

After the existing `chrome.runtime.onMessage.addListener` block (after line 472), before the `mouseup` listener, add:

```typescript
// Read selectionTranslate setting and listen for changes
chrome.storage.local.get("settings", (result) => {
  if (result.settings?.selectionTranslate !== undefined) {
    selectionTranslateEnabled = result.settings.selectionTranslate;
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.settings?.newValue?.selectionTranslate !== undefined) {
    selectionTranslateEnabled = changes.settings.newValue.selectionTranslate;
  }
});
```

- [ ] **Step 2: Gate the mouseup handler**

Replace the mouseup listener (lines 474-477):

```typescript
// Before:
document.addEventListener("mouseup", () => {
  setTimeout(handleSelectionTranslate, 10);
});

// After:
document.addEventListener("mouseup", () => {
  if (!selectionTranslateEnabled) return;
  setTimeout(handleSelectionTranslate, 10);
});
```

- [ ] **Step 3: Verify the build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/content/index.ts
git commit -m "feat: gate selection translation on selectionTranslate setting"
```

---

### Task 5: Selection translate toggle in Options page

**Files:**
- Modify: `src/options/App.tsx:518-519` (insert toggle before glossary toggle)

- [ ] **Step 1: Add selection translate toggle UI**

Insert the following block just before the glossary toggle `<div>` at line 519 (before `<div style={{ ...styles.field, display: "flex", alignItems: "center", justifyContent: "space-between" }}>`):

```tsx
        <div style={{ ...styles.field, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <label style={{ ...styles.label, marginBottom: 0 }}>划词翻译</label>
          <label style={{ position: "relative", display: "inline-block", width: 44, height: 24, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={settings.selectionTranslate}
              onChange={(e) => setSettings({ ...settings, selectionTranslate: e.target.checked })}
              aria-label="划词翻译"
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: settings.selectionTranslate ? colors.primary : colors.border,
              borderRadius: 12,
              transition: "background-color 0.2s",
            }} />
            <span style={{
              position: "absolute",
              top: 2,
              left: settings.selectionTranslate ? 22 : 2,
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
          选中文本后自动弹出翻译提示
        </p>
```

- [ ] **Step 2: Verify the build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/options/App.tsx
git commit -m "feat: add selection translate toggle to options page"
```

---

### Task 6: Run full test suite

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 2: Verify no regressions**

Confirm existing `selection-translate.test.ts` tests still pass (the `computeTooltipPosition` and `buildSelectionTooltip` tests are unaffected by our changes).
