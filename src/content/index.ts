// 扩展 HTMLElement 用于存储 tooltip 的事件 handler
declare global {
  interface HTMLElement {
    _outsideClickHandler?: (e: MouseEvent) => void;
    _escHandler?: (e: KeyboardEvent) => void;
  }
}

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
// 防止重复创建 tooltip
let isCreatingTooltip = false;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 配色与 popup 风格一致
const TOOLTIP_COLORS = {
  bg: "#F8FBF9",
  card: "#FFFFFF",
  primary: "#10B981",
  primaryHover: "#059669",
  text: "#1F2937",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  error: "#dc2626",
  loading: "#9CA3AF",
};

function showSelectionTooltip(x: number, y: number, source: string, translated?: string, loading = false): void {
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
    left: ${x + 10}px;
    top: ${y + 10}px;
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

  const sourceDiv = document.createElement("div");
  sourceDiv.style.marginBottom = "8px";
  sourceDiv.style.color = TOOLTIP_COLORS.text;
  sourceDiv.appendChild(document.createElement("strong")).textContent = "原文：";
  sourceDiv.appendChild(document.createTextNode(source));

  const translatedDiv = document.createElement("div");
  translatedDiv.id = "wpt-tooltip-translated";
  translatedDiv.style.marginBottom = "8px";
  translatedDiv.style.color = TOOLTIP_COLORS.text;
  if (translated !== undefined) {
    translatedDiv.appendChild(document.createElement("strong")).textContent = "译文：";
    translatedDiv.appendChild(document.createTextNode(translated));
  }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.style.cssText = `
    display: inline-block;
    padding: 4px 12px;
    font-size: 13px;
    font-weight: 500;
    color: #ffffff;
    background: ${TOOLTIP_COLORS.primary};
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s;
  `;

  if (loading) {
    btn.textContent = "翻译中...";
    btn.disabled = true;
    btn.style.background = TOOLTIP_COLORS.loading;
    btn.style.cursor = "wait";
    translatedDiv.appendChild(document.createElement("strong")).textContent = "译文：";
    translatedDiv.appendChild(document.createTextNode("翻译中..."));
  } else if (translated !== undefined) {
    btn.textContent = "已翻译";
    btn.disabled = true;
    btn.style.background = TOOLTIP_COLORS.primary;
    btn.style.cursor = "default";
  } else {
    btn.textContent = "翻译";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      doTranslate(source, x, y, tooltip, sourceDiv, translatedDiv, btn);
    });
    btn.addEventListener("mouseenter", () => {
      btn.style.background = TOOLTIP_COLORS.primaryHover;
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = TOOLTIP_COLORS.primary;
    });
  }

  const footer = document.createElement("div");
  footer.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-top:2px;";
  footer.appendChild(btn);

  const logoImg = document.createElement("img");
  logoImg.src = chrome.runtime.getURL("icon-48.png");
  logoImg.alt = "";
  logoImg.draggable = false;
  logoImg.style.cssText = "width:18px;height:18px;pointer-events:none;opacity:0.6;";
  footer.appendChild(logoImg);

  tooltip.appendChild(sourceDiv);
  tooltip.appendChild(translatedDiv);
  tooltip.appendChild(footer);
  document.body.appendChild(tooltip);
  selectionTooltip = tooltip;

  // 外部点击关闭
  const outsideClickHandler = (e: MouseEvent) => {
    if (tooltip.contains(e.target as Node)) {
      return;
    }
    hideSelectionTooltip();
  };

  setTimeout(() => {
    document.addEventListener("click", outsideClickHandler);
    (selectionTooltip as HTMLElement)._outsideClickHandler = outsideClickHandler;
  }, 100);

  // Escape 键关闭
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      hideSelectionTooltip();
    }
  };
  document.addEventListener("keydown", escHandler);
  (selectionTooltip as HTMLElement)._escHandler = escHandler;

  // 重置创建状态（当 tooltip 真正显示出来后）
  isCreatingTooltip = false;
}

async function doTranslate(
  source: string,
  x: number,
  y: number,
  tooltip: HTMLElement,
  sourceDiv: HTMLDivElement,
  translatedDiv: HTMLDivElement,
  btn: HTMLButtonElement
): Promise<void> {
  // 防止重复调用：如果正在翻译中，则忽略
  if (btn.textContent === "翻译中...") {
    return;
  }

  // 清除之前的 onclick，避免重复绑定
  btn.onclick = null;

  btn.textContent = "翻译中...";
  btn.disabled = true;
  btn.style.background = TOOLTIP_COLORS.loading;
  btn.style.cursor = "wait";
  translatedDiv.textContent = "";
  translatedDiv.style.color = TOOLTIP_COLORS.text;
  translatedDiv.appendChild(document.createElement("strong")).textContent = "译文：";
  translatedDiv.appendChild(document.createTextNode("翻译中..."));

  try {
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SUBMIT_SEGMENTS_BATCH,
      payload: { texts: [source] },
    });

    if (response.success && response.data.results[0].status === "ok") {
      const result = response.data.results[0];
      translatedDiv.textContent = "";
      translatedDiv.style.color = TOOLTIP_COLORS.text;
      translatedDiv.appendChild(document.createElement("strong")).textContent = "译文：";
      translatedDiv.appendChild(document.createTextNode(result.text));
      btn.textContent = "已翻译";
      btn.disabled = true;
      btn.style.background = TOOLTIP_COLORS.primary;
      btn.style.cursor = "default";
    } else {
      translatedDiv.textContent = "";
      translatedDiv.style.color = TOOLTIP_COLORS.error;
      translatedDiv.appendChild(document.createElement("strong")).textContent = "译文：";
      translatedDiv.appendChild(document.createTextNode("[翻译失败]"));
      btn.textContent = "重试";
      btn.disabled = false;
      btn.style.background = TOOLTIP_COLORS.primary;
      btn.style.cursor = "pointer";
      // 重新绑定点击事件
      btn.onclick = (e) => {
        e.stopPropagation();
        doTranslate(source, x, y, tooltip, sourceDiv, translatedDiv, btn);
      };
    }
  } catch {
    translatedDiv.textContent = "";
    translatedDiv.style.color = TOOLTIP_COLORS.error;
    translatedDiv.appendChild(document.createElement("strong")).textContent = "译文：";
    translatedDiv.appendChild(document.createTextNode("[翻译失败]"));
    btn.textContent = "重试";
    btn.disabled = false;
    btn.style.background = TOOLTIP_COLORS.primary;
    btn.style.cursor = "pointer";
    // 重新绑定点击事件
    btn.onclick = (e) => {
      e.stopPropagation();
      doTranslate(source, x, y, tooltip, sourceDiv, translatedDiv, btn);
    };
  }
}

function hideSelectionTooltip(): void {
  if (selectionTooltip) {
    const tooltip = selectionTooltip as HTMLElement;
    const outsideHandler = tooltip._outsideClickHandler as ((e: MouseEvent) => void) | undefined;
    const escHandler = tooltip._escHandler as ((e: KeyboardEvent) => void) | undefined;

    if (outsideHandler) {
      document.removeEventListener("click", outsideHandler);
    }
    if (escHandler) {
      document.removeEventListener("keydown", escHandler);
    }

    tooltip.remove();
    selectionTooltip = null;
  }
}

function handleSelectionTranslate(): void {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    return;
  }

  const selectedText = selection.toString().trim();
  if (!selectedText || selectedText.length < 2) {
    return;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  showSelectionTooltip(rect.left, rect.top, selectedText);
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
  btn.style.width = "28px";
  btn.style.height = "28px";
  btn.style.padding = "0";
  btn.style.border = "none";
  btn.style.borderRadius = "50%";
  btn.style.background = "transparent";
  btn.style.cursor = "grab";
  btn.style.boxShadow = "none";
  btn.style.userSelect = "none";
  btn.style.touchAction = "none";
  btn.style.display = "flex";
  btn.style.alignItems = "center";
  btn.style.justifyContent = "center";

  const img = document.createElement("img");
  img.src = chrome.runtime.getURL("icon-48.png");
  img.alt = "translation toggle";
  img.draggable = false;
  img.style.width = "28px";
  img.style.height = "28px";
  img.style.pointerEvents = "none";
  btn.appendChild(img);

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

  const img = floatingToggleEl.querySelector("img");
  if (!img) return;

  if (isPageTranslating) {
    img.style.opacity = "0.5";
    img.style.animation = "wpt-pulse 1.2s ease-in-out infinite";
    floatingToggleEl.title = "翻译中...";
    floatingToggleEl.setAttribute("aria-label", "翻译中...");
    floatingToggleEl.style.cursor = "wait";
    ensurePulseKeyframes();
    return;
  }

  img.style.animation = "none";
  floatingToggleEl.style.cursor = "grab";
  if (isTranslationVisible()) {
    img.style.opacity = "0.45";
    floatingToggleEl.title = "恢复原文";
    floatingToggleEl.setAttribute("aria-label", "恢复原文");
    return;
  }

  img.style.opacity = "1";
  floatingToggleEl.title = "显示译文";
  floatingToggleEl.setAttribute("aria-label", "显示译文");
}

function ensurePulseKeyframes(): void {
  if (document.getElementById("wpt-pulse-style")) return;
  const style = document.createElement("style");
  style.id = "wpt-pulse-style";
  style.textContent = `@keyframes wpt-pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }`;
  document.head.appendChild(style);
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
