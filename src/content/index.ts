import { extractSegments } from "./dom-extractor";
import {
  hasCompletedTranslations,
  isTranslationVisible,
  renderTranslationBlock,
  setTranslationVisibility,
  toggleTranslationVisibility,
  updateSegmentStatus
} from "./translation-renderer";
import { MESSAGE_TYPES } from "../shared/constants";
import type { Segment } from "./dom-extractor";

let segments: Segment[] = [];
let isPageTranslating = false;
let floatingToggleEl: HTMLButtonElement | null = null;

const FLOATING_TOGGLE_ID = "wpt-page-toggle";
const FLOATING_POSITION_KEY = "wpt-floating-position-v1";

// Selection translation state
let selectionTooltip: HTMLElement | null = null;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showSelectionTooltip(x: number, y: number, source: string, translated: string): void {
  hideSelectionTooltip();

  const tooltip = document.createElement("div");
  tooltip.className = "wpt-selection-tooltip";
  tooltip.id = "wpt-selection-tooltip";
  tooltip.style.cssText = `
    position: fixed;
    left: ${x + 10}px;
    top: ${y + 10}px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 12px 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    max-width: 300px;
  `;

  const sourceDiv = document.createElement("div");
  sourceDiv.style.marginBottom = "8px";
  sourceDiv.innerHTML = `<strong>原文：</strong>${escapeHtml(source)}`;

  const translatedDiv = document.createElement("div");
  translatedDiv.innerHTML = `<strong>译文：</strong>${escapeHtml(translated)}`;

  tooltip.appendChild(sourceDiv);
  tooltip.appendChild(translatedDiv);
  document.body.appendChild(tooltip);
  selectionTooltip = tooltip;

  setTimeout(() => {
    document.addEventListener("click", hideSelectionTooltipOnClick);
  }, 100);
}

function hideSelectionTooltip(): void {
  if (selectionTooltip) {
    selectionTooltip.remove();
    selectionTooltip = null;
  }
  document.removeEventListener("click", hideSelectionTooltipOnClick);
}

function hideSelectionTooltipOnClick(e: MouseEvent): void {
  const tooltip = document.getElementById("wpt-selection-tooltip");
  if (tooltip && !tooltip.contains(e.target as Node)) {
    hideSelectionTooltip();
  }
}

async function handleSelectionTranslate(): Promise<void> {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    hideSelectionTooltip();
    return;
  }

  const selectedText = selection.toString().trim();
  if (!selectedText || selectedText.length < 2) {
    hideSelectionTooltip();
    return;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  try {
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SUBMIT_SEGMENTS_BATCH,
      payload: { texts: [selectedText] },
    });

    if (response.success) {
      const result = response.data.results[0];
      if (result.status === "ok") {
        showSelectionTooltip(rect.left, rect.top, selectedText, result.text);
      } else {
        showSelectionTooltip(rect.left, rect.top, selectedText, "[翻译失败]");
      }
    }
  } catch {
    showSelectionTooltip(rect.left, rect.top, selectedText, "[翻译失败]");
  }
}

export async function runPageTranslationFlow(): Promise<{ total: number; completed: number; failed: number }> {
  isPageTranslating = true;
  setTranslationVisibility(true);
  updateFloatingToggleLabel();

  try {
    segments = extractSegments();

    if (segments.length === 0) {
      return { total: 0, completed: 0, failed: 0 };
    }

    // 先渲染所有"翻译中..."占位
    for (const segment of segments) {
      renderTranslationBlock(segment, "翻译中...", "pending");
    }

    let completed = 0;
    let failed = 0;

    const batchSize = 10;
    for (let i = 0; i < segments.length; i += batchSize) {
      const batch = segments.slice(i, i + batchSize);
      const texts = batch.map((s) => s.text);

      try {
        const response = await chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.SUBMIT_SEGMENTS_BATCH,
          payload: { texts },
        });

        if (response.success) {
          const { results } = response.data;

          for (let j = 0; j < batch.length; j++) {
            const segment = batch[j];
            const result = results[j];

            if (result.status === "ok") {
              updateSegmentStatus(segment.segmentId, "done", result.text);
              completed++;
            } else {
              updateSegmentStatus(segment.segmentId, "failed", "[翻译失败]");
              failed++;
            }
          }
        } else {
          for (const segment of batch) {
            updateSegmentStatus(segment.segmentId, "failed", "[翻译失败]");
            failed++;
          }
        }
      } catch {
        for (const segment of batch) {
          updateSegmentStatus(segment.segmentId, "failed", "[翻译失败]");
          failed++;
        }
      }
    }

    return { total: segments.length, completed, failed };
  } finally {
    isPageTranslating = false;
    updateFloatingToggleLabel();
  }
}

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === MESSAGE_TYPES.START_PAGE_TRANSLATION) {
      runPageTranslationFlow()
        .then(({ total, completed, failed }) => {
          chrome.runtime.sendMessage({
            type: MESSAGE_TYPES.TRANSLATION_PROGRESS,
            payload: { total, completed, failed },
          });
        })
        .catch((error) => {
          chrome.runtime.sendMessage({
            type: MESSAGE_TYPES.TRANSLATION_ERROR,
            error: error.message,
          });
        });
    }
  });
}

// Listen for text selection to trigger selection translation
document.addEventListener("mouseup", () => {
  setTimeout(handleSelectionTranslate, 10);
});

ensureFloatingToggle();

// @crxjs/vite-plugin requires content scripts to export onExecute
export function onExecute() {
  // Content script is already initialized via top-level code above
}

function ensureFloatingToggle(): void {
  if (document.getElementById(FLOATING_TOGGLE_ID)) return;

  const btn = document.createElement("button");
  btn.id = FLOATING_TOGGLE_ID;
  btn.type = "button";
  btn.style.position = "fixed";
  btn.style.left = "12px";
  btn.style.top = "40vh";
  btn.style.zIndex = "2147483646";
  btn.style.width = "44px";
  btn.style.height = "44px";
  btn.style.padding = "0";
  btn.style.border = "1px solid rgba(0,0,0,0.15)";
  btn.style.borderRadius = "50%";
  btn.style.background = "#ffffff";
  btn.style.color = "#111827";
  btn.style.fontSize = "14px";
  btn.style.fontWeight = "600";
  btn.style.cursor = "grab";
  btn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
  btn.style.userSelect = "none";
  btn.style.touchAction = "none";
  btn.style.display = "flex";
  btn.style.alignItems = "center";
  btn.style.justifyContent = "center";

  applySavedPosition(btn);
  setupFloatingDrag(btn);
  btn.addEventListener("click", handleFloatingToggleClick);

  floatingToggleEl = btn;
  updateFloatingToggleLabel();
  document.body.appendChild(btn);
}

function handleFloatingToggleClick(): void {
  if (floatingToggleEl?.dataset.dragged === "1") {
    floatingToggleEl.dataset.dragged = "0";
    return;
  }

  if (isPageTranslating) return;

  if (!hasCompletedTranslations()) {
    runPageTranslationFlow()
      .then(() => {
        setTranslationVisibility(true);
        updateFloatingToggleLabel();
      })
      .catch(() => {
        updateFloatingToggleLabel();
      });
    return;
  }

  toggleTranslationVisibility();
  updateFloatingToggleLabel();
}

function updateFloatingToggleLabel(): void {
  if (!floatingToggleEl) return;

  if (isPageTranslating) {
    floatingToggleEl.textContent = "…";
    floatingToggleEl.title = "翻译中...";
    floatingToggleEl.setAttribute("aria-label", "翻译中...");
    floatingToggleEl.style.cursor = "wait";
    return;
  }

  floatingToggleEl.style.cursor = "grab";
  if (isTranslationVisible()) {
    floatingToggleEl.textContent = "原";
    floatingToggleEl.title = "恢复原文";
    floatingToggleEl.setAttribute("aria-label", "恢复原文");
    return;
  }

  floatingToggleEl.textContent = "译";
  floatingToggleEl.title = "显示译文";
  floatingToggleEl.setAttribute("aria-label", "显示译文");
}

function setupFloatingDrag(btn: HTMLButtonElement): void {
  let dragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  btn.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    dragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = btn.offsetLeft;
    startTop = btn.offsetTop;
    btn.style.cursor = "grabbing";
    btn.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  btn.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;

    const nextLeft = clamp(startLeft + dx, 0, window.innerWidth - btn.offsetWidth);
    const nextTop = clamp(startTop + dy, 0, window.innerHeight - btn.offsetHeight);
    btn.style.left = `${nextLeft}px`;
    btn.style.top = `${nextTop}px`;
  });

  btn.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    dragging = false;
    btn.releasePointerCapture(e.pointerId);

    if (moved) {
      btn.dataset.dragged = "1";
      snapToEdge(btn);
      savePosition(btn);
      return;
    }

    btn.style.cursor = "grab";
  });
}

function snapToEdge(btn: HTMLButtonElement): void {
  const left = btn.offsetLeft;
  const viewportWidth = window.innerWidth;
  const mid = viewportWidth / 2;
  const margin = 12;

  const nextLeft = left + btn.offsetWidth / 2 < mid
    ? margin
    : Math.max(margin, viewportWidth - btn.offsetWidth - margin);
  const nextTop = clamp(btn.offsetTop, margin, window.innerHeight - btn.offsetHeight - margin);

  btn.style.left = `${nextLeft}px`;
  btn.style.top = `${nextTop}px`;
  btn.style.cursor = "grab";
}

function savePosition(btn: HTMLButtonElement): void {
  const value = JSON.stringify({ left: btn.style.left, top: btn.style.top });
  window.localStorage.setItem(FLOATING_POSITION_KEY, value);
}

function applySavedPosition(btn: HTMLButtonElement): void {
  try {
    const raw = window.localStorage.getItem(FLOATING_POSITION_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { left?: string; top?: string };
    if (parsed.left) btn.style.left = parsed.left;
    if (parsed.top) btn.style.top = parsed.top;
    btn.style.top = `${clamp(btn.offsetTop, 12, window.innerHeight - btn.offsetHeight - 12)}px`;
  } catch {
    // ignore malformed localStorage data
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
