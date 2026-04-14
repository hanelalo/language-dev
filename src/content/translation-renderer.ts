import type { Segment } from "./dom-extractor";
import { markSegmentTranslated } from "./dom-extractor";

type Status = "pending" | "running" | "done" | "failed";

type SegmentState = {
  segment: Segment;
  translatedText?: string;
  originalText?: string;
  block?: HTMLElement;
};

const segmentStatesById = new Map<string, SegmentState>();
let translationVisible = false;

export function renderTranslationBlock(
  segment: Segment,
  translated: string,
  status: Status = "done"
): void {
  const state = getOrCreateState(segment);

  if (segment.renderMode === "append") {
    renderAppendSegment(state, translated, status);
    return;
  }

  const node = state.segment.node;
  if (!node) return;

  if (state.originalText === undefined) {
    state.originalText = node.nodeValue ?? "";
  }

  if (status === "pending" || status === "running") {
    return;
  }

  if (status === "done") {
    state.translatedText = translated;
    applyReplaceVisibility(state);
    markSegmentTranslated(segment);
    return;
  }

  if (status === "failed") {
    state.translatedText = undefined;
    if (state.originalText !== undefined) {
      node.nodeValue = state.originalText;
    }
  }
}

export function updateSegmentStatus(
  segmentId: string,
  status: Status,
  translated?: string
): void {
  const state = segmentStatesById.get(segmentId);
  if (!state) return;
  renderTranslationBlock(state.segment, translated ?? "", status);
}

export function toggleTranslationVisibility(): boolean {
  translationVisible = !translationVisible;
  applyVisibilityToAllSegments();
  return translationVisible;
}

export function setTranslationVisibility(visible: boolean): boolean {
  translationVisible = visible;
  applyVisibilityToAllSegments();
  return translationVisible;
}

export function isTranslationVisible(): boolean {
  return translationVisible;
}

export function hasCompletedTranslations(): boolean {
  for (const state of segmentStatesById.values()) {
    if (state.translatedText) return true;
  }
  return false;
}

function renderAppendSegment(state: SegmentState, translated: string, status: Status): void {
  const element = state.segment.element;
  if (!element) return;

  const block = state.block ?? getOrCreateTranslationBlock(state.segment.segmentId, element);
  state.block = block;
  copyTypographyFromAnchor(element, block);

  if (status === "pending" || status === "running") {
    block.textContent = "翻译中...";
    applyAppendVisibility(state);
    return;
  }

  if (status === "failed") {
    state.translatedText = undefined;
    block.textContent = "[翻译失败]";
    applyAppendVisibility(state);
    return;
  }

  state.translatedText = translated;
  block.textContent = translated;
  applyAppendVisibility(state);
  markSegmentTranslated(state.segment);
}

function getOrCreateTranslationBlock(segmentId: string, anchor: Element): HTMLElement {
  const existing = document.querySelector(`[data-wpt-id="${segmentId}"]`) as HTMLElement | null;
  if (existing) return existing;

  const block = document.createElement("div");
  block.setAttribute("data-wpt-id", segmentId);
  block.className = "wpt-translation-block";
  block.style.marginTop = "8px";
  block.style.padding = "0";
  copyTypographyFromAnchor(anchor, block);

  anchor.insertAdjacentElement("afterend", block);
  return block;
}

function copyTypographyFromAnchor(anchor: Element, target: HTMLElement): void {
  const computed = window.getComputedStyle(anchor);
  const props = [
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "font-variant",
    "line-height",
    "letter-spacing",
    "word-spacing",
    "text-transform",
    "text-decoration",
    "text-align",
    "color"
  ];

  for (const prop of props) {
    const value = computed.getPropertyValue(prop);
    if (!value) continue;
    target.style.setProperty(prop, value);
  }
}

function getOrCreateState(segment: Segment): SegmentState {
  const existing = segmentStatesById.get(segment.segmentId);
  if (existing) {
    existing.segment = segment;
    return existing;
  }

  const state: SegmentState = { segment };
  segmentStatesById.set(segment.segmentId, state);
  return state;
}

function applyVisibilityToAllSegments(): void {
  for (const state of segmentStatesById.values()) {
    if (state.segment.renderMode === "append") {
      applyAppendVisibility(state);
    } else {
      applyReplaceVisibility(state);
    }
  }
}

function applyAppendVisibility(state: SegmentState): void {
  if (!state.block) return;
  state.block.style.display = translationVisible ? "" : "none";
}

function applyReplaceVisibility(state: SegmentState): void {
  const node = state.segment.node;
  if (!node || state.originalText === undefined) return;

  if (translationVisible && state.translatedText) {
    node.nodeValue = preserveOuterWhitespace(state.originalText, state.translatedText);
    return;
  }

  node.nodeValue = state.originalText;
}

function preserveOuterWhitespace(original: string, translated: string): string {
  const leading = original.match(/^\s*/)?.[0] ?? "";
  const trailing = original.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}
