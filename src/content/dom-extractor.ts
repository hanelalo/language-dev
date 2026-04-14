export type Segment = {
  segmentId: string;
  text: string;
  xpath: string;
  order: number;
  element?: Element;
  node?: Text;
  renderMode: "append" | "replace";
};

const SKIP_SELECTORS = 'code,pre,script,style,input,textarea,[translate="no"]';
const APPEND_TAGS = new Set([
  "P",
  "LI",
  "TD",
  "TH",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "BLOCKQUOTE",
  "FIGCAPTION"
]);
const INTERACTIVE_SELECTORS = "a,button,nav,[role='button'],label,summary,select,option";
const translatedNodes = new WeakSet<Text>();
const translatedElements = new WeakSet<Element>();

export function extractSegments(): Segment[] {
  const result: Segment[] = [];
  let idx = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const appendedElementsInPass = new WeakSet<Element>();
  let current = walker.nextNode();

  while (current) {
    const textNode = current as Text;
    const parent = textNode.parentElement;
    current = walker.nextNode();

    if (!parent) continue;
    if (parent.closest(SKIP_SELECTORS)) continue;
    if (translatedNodes.has(textNode)) continue;

    const text = textNode.nodeValue?.trim() ?? "";
    if (!text || text.length < 2) continue;

    const appendContainer = findAppendContainer(parent);
    if (appendContainer) {
      if (translatedElements.has(appendContainer) || appendedElementsInPass.has(appendContainer)) {
        continue;
      }

      const blockText = appendContainer.textContent?.trim() ?? "";
      if (blockText.length >= 2) {
        result.push({
          segmentId: `wpt-seg-${idx}`,
          text: blockText,
          xpath: getXPath(appendContainer),
          order: idx,
          element: appendContainer,
          renderMode: "append"
        });
        idx++;
        appendedElementsInPass.add(appendContainer);
      }
      continue;
    }

    result.push({
      segmentId: `wpt-seg-${idx}`,
      text,
      xpath: getTextNodeXPath(textNode),
      order: idx,
      element: parent,
      node: textNode,
      renderMode: "replace"
    });
    idx++;
  }

  return result;
}

export function markSegmentTranslated(segment: Segment): void {
  if (segment.renderMode === "append" && segment.element) {
    translatedElements.add(segment.element);
    return;
  }

  if (segment.renderMode === "replace" && segment.node) {
    translatedNodes.add(segment.node);
  }
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

function getTextNodeXPath(node: Text): string {
  const parent = node.parentElement;
  if (!parent) return "";

  const textSiblings = Array.from(parent.childNodes).filter(
    (child) => child.nodeType === Node.TEXT_NODE
  );
  const index = textSiblings.indexOf(node) + 1;
  return `${getXPath(parent)}/text()[${index}]`;
}

function findAppendContainer(start: Element): Element | null {
  const container = start.closest(Array.from(APPEND_TAGS).map((tag) => tag.toLowerCase()).join(","));
  if (!container) return null;
  if (container.closest(INTERACTIVE_SELECTORS)) return null;
  return container;
}
