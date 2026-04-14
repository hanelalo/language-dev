import type { Segment } from "./dom-extractor";

type Status = "pending" | "running" | "done" | "failed";

const STATUS_COLOR: Record<Status, string> = {
  pending: "#9ca3af",
  running: "#16a34a",
  done: "#7c3aed",
  failed: "#dc2626"
};

export function renderTranslationBlock(
  segment: Segment,
  translated: string,
  status: Status = "done"
): void {
  const element = segment.element;
  if (!element) return;

  const color = STATUS_COLOR[status];

  const wrapper = document.createElement("div");
  wrapper.className = "wpt-segment";
  wrapper.setAttribute("data-wpt-id", segment.segmentId);

  const sourceP = document.createElement("p");
  sourceP.className = "wpt-source";
  sourceP.textContent = segment.text;

  const translatedP = document.createElement("p");
  translatedP.className = "wpt-translated";
  translatedP.style.borderLeft = `4px solid ${color}`;
  translatedP.style.paddingLeft = "10px";
  translatedP.style.marginTop = "8px";
  translatedP.textContent = translated || (status === "failed" ? "[翻译失败]" : "");

  const hr = document.createElement("hr");
  hr.style.borderTop = "1px dashed #999";
  hr.style.marginTop = "12px";

  wrapper.appendChild(sourceP);
  wrapper.appendChild(translatedP);
  wrapper.appendChild(hr);

  element.insertAdjacentElement("afterend", wrapper);
  element.setAttribute("data-wpt-translated", "true");
}

export function updateSegmentStatus(
  segmentId: string,
  status: Status,
  translated?: string
): void {
  const wrapper = document.querySelector(`[data-wpt-id="${segmentId}"]`);
  if (!wrapper) return;

  const translatedP = wrapper.querySelector(".wpt-translated") as HTMLElement;
  if (!translatedP) return;

  const color = STATUS_COLOR[status];
  translatedP.style.borderLeft = `4px solid ${color}`;

  if (translated) {
    translatedP.textContent = translated;
  }

  if (status === "failed") {
    translatedP.textContent = "[翻译失败]";
  }
}
