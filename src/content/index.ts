import { extractSegments } from "./dom-extractor";
import { renderTranslationBlock } from "./translation-renderer";
import { MESSAGE_TYPES } from "../shared/constants";
import type { Segment } from "./dom-extractor";

let segments: Segment[] = [];

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
  segments = extractSegments();

  if (segments.length === 0) {
    return { total: 0, completed: 0, failed: 0 };
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
            renderTranslationBlock(segment, result.text);
            completed++;
          } else {
            renderTranslationBlock(segment, "", "failed");
            failed++;
          }
        }
      } else {
        for (const segment of batch) {
          renderTranslationBlock(segment, "", "failed");
          failed++;
        }
      }
    } catch {
      for (const segment of batch) {
        renderTranslationBlock(segment, "", "failed");
        failed++;
      }
    }
  }

  return { total: segments.length, completed, failed };
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
