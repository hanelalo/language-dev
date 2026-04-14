export type Segment = {
  segmentId: string;
  text: string;
  xpath: string;
  order: number;
  element?: Element;
};

const TARGET_TAGS = ["p", "div", "span", "li", "td", "h1", "h2", "h3", "h4", "h5", "h6", "a"];
const SKIP_TAGS = new Set(["CODE", "PRE", "SCRIPT", "STYLE", "INPUT", "TEXTAREA"]);
const SKIP_SELECTORS = 'code,pre,script,style,input,textarea,[translate="no"]';

export function extractSegments(): Segment[] {
  const result: Segment[] = [];
  const nodes = document.body.querySelectorAll(TARGET_TAGS.join(","));
  let idx = 0;

  for (const node of nodes) {
    if (SKIP_TAGS.has(node.tagName)) continue;
    if (node.closest(SKIP_SELECTORS)) continue;

    const text = node.textContent?.trim() ?? "";
    if (!text || text.length < 2) continue;

    const xpath = getXPath(node);

    if (node.closest("[data-wpt-translated]")) continue;

    result.push({
      segmentId: `wpt-seg-${idx}`,
      text,
      xpath,
      order: idx,
      element: node,
    });
    idx++;
  }

  return result;
}

function getXPath(element: Element): string {
  if (!element.parentElement) return "";

  const siblings = Array.from(element.parentElement.children).filter(
    (e) => e.tagName === element.tagName
  );

  if (siblings.length === 1) {
    return `${getXPath(element.parentElement)}/${element.tagName.toLowerCase()}`;
  }

  const index = siblings.indexOf(element) + 1;
  return `${getXPath(element.parentElement)}/${element.tagName.toLowerCase()}[${index}]`;
}
