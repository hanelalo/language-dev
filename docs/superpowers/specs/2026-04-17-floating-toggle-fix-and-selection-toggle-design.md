# Floating Toggle Fix & Selection Translate Toggle

## Problem Statement

Two issues:
1. The floating toggle button (`wpt-page-toggle`) sometimes fails to appear on pages — no console errors.
2. The `selectionTranslate` setting exists in the storage schema but has no UI toggle and is not read by the content script.

## Design

### Part 1: Floating Toggle Robustness

**File**: `src/content/index.ts`

#### 1.1 MutationObserver Guard

Add a `MutationObserver` on `document.body` that detects removal of `#wpt-page-toggle` and re-creates it via `ensureFloatingToggle()`.

- Observer watches `childList` changes on `body`.
- On detection that the element is missing, call `ensureFloatingToggle()` to recreate.
- Use a debounce (100ms) to avoid rapid re-creation loops.
- Only observe while the element is present; re-attach if the element comes back.

#### 1.2 Fallback Visibility

Add a semi-transparent background color to the button so it remains visible even if `icon-48.png` fails to load.

- Add `background: rgba(16, 185, 129, 0.15)` as a fallback background.
- On hover, change to `rgba(16, 185, 129, 0.3)`.
- This ensures the 28x28px button is always perceivable.

#### 1.3 DOMContentLoaded Fallback

Wrap `ensureFloatingToggle()` call in both an immediate invocation and a `DOMContentLoaded` listener as a fallback for pages where `document.body` may not be ready at `document_idle`.

- If `document.body` exists, call immediately (current behavior).
- Also register a one-shot `DOMContentLoaded` listener that calls `ensureFloatingToggle()` if the button doesn't exist yet.
- `ensureFloatingToggle()` already has an early return if the element exists, so double-calling is safe.

### Part 2: Selection Translate Toggle

#### 2.1 Options Page UI

**File**: `src/options/App.tsx`

Add a toggle switch for `selectionTranslate` in the "翻译设置" section, placed before the "术语表预扫描" toggle. Same visual style as the existing glossary toggle (44x24px toggle switch).

- Label: "划词翻译"
- Description: "选中文本后自动弹出翻译提示"
- Bound to `settings.selectionTranslate`
- Persisted via the existing `handleSave` flow.

#### 2.2 Content Script Gate

**File**: `src/content/index.ts`

In the `mouseup` event listener (line 475-477), read `selectionTranslate` from storage before calling `handleSelectionTranslate()`.

- Cache the value in a module-level variable to avoid reading storage on every mouseup.
- Initialize the cache on content script startup.
- Use `chrome.storage.onChanged` to update the cache when the setting changes.

```typescript
let selectionTranslateEnabled = true;

// On startup
chrome.storage.local.get("settings", (result) => {
  if (result.settings?.selectionTranslate !== undefined) {
    selectionTranslateEnabled = result.settings.selectionTranslate;
  }
});

// On change
chrome.storage.onChanged.addListener((changes) => {
  if (changes.settings?.newValue?.selectionTranslate !== undefined) {
    selectionTranslateEnabled = changes.settings.newValue.selectionTranslate;
  }
});
```

- In `mouseup` handler, check `selectionTranslateEnabled` before proceeding.

## Testing

### Part 1
- Verify the button appears on a normal page.
- Verify the button reappears after being manually removed from DOM (simulating SPA body replacement).
- Verify the button is visible even when the icon image is blocked/missing.

### Part 2
- Toggle "划词翻译" off in options page, save, verify selection translation is disabled on pages.
- Toggle it back on, save, verify it works again without page refresh.
