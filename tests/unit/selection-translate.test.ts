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
    Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });

    const tooltip = makeTooltip(200, 100);
    const rect = makeRect(400, 400, 80, 20);

    const pos = computeTooltipPosition(tooltip, rect);

    expect(pos.top).toBe(292);
    expect(pos.left).toBe(340);
  });

  it("positions tooltip below selection when above has no room", () => {
    Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });

    const tooltip = makeTooltip(200, 100);
    const rect = makeRect(400, 10, 80, 20);

    const pos = computeTooltipPosition(tooltip, rect);

    expect(pos.top).toBe(38);
  });

  it("picks closest valid position when multiple options exist", () => {
    Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });

    const tooltip = makeTooltip(200, 100);
    const rect = makeRect(400, 100, 80, 20);

    const pos = computeTooltipPosition(tooltip, rect);

    // Above: top = 100 - 100 - 8 = -8 (invalid, < 8 pad)
    // Below: top = 120 + 8 = 128
    expect(pos.top).toBe(128);
    expect(pos.left).toBe(340);
  });

  it("clamps tooltip left edge when it would overflow left", () => {
    Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });

    const tooltip = makeTooltip(200, 100);
    const rect = makeRect(20, 400, 80, 20);

    const pos = computeTooltipPosition(tooltip, rect);

    // Above: left = 60 - 100 = -40, clamped to 8
    expect(pos.left).toBe(8);
    expect(pos.top).toBe(292);
  });
});
