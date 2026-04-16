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

let ridCounter = 0;

export function markDocumentNodes(): void {
  ridCounter = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();

  while (current) {
    const textNode = current as Text;
    const parent = textNode.parentElement;
    current = walker.nextNode();

    if (!parent) continue;
    const text = textNode.nodeValue?.trim() ?? "";
    if (!text || text.length < 2) continue;

    parent.setAttribute("data-wpt-rid", `wpt-rid-${ridCounter++}`);
  }
}

export function extractArticleSegments(contentHTML: string): Segment[] {
  // contentHTML comes from Readability's sanitized output, safe to parse
  const parser = new DOMParser();
  const doc = parser.parseFromString(contentHTML, "text/html");
  const container = doc.body;

  const result: Segment[] = [];
  let idx = 0;
  const appendedElementsInPass = new WeakSet<Element>();
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();

  while (current) {
    const textNode = current as Text;
    const parent = textNode.parentElement;
    current = walker.nextNode();

    if (!parent) continue;
    if (parent.closest(SKIP_SELECTORS)) continue;

    const text = textNode.nodeValue?.trim() ?? "";
    if (!text || text.length < 2) continue;

    // Map back to original DOM via data-wpt-rid marker
    const rid = parent.getAttribute("data-wpt-rid");
    const originalElement = rid ? document.querySelector(`[data-wpt-rid="${rid}"]`) as Element | null : null;
    if (!originalElement) continue;

    const appendContainer = findAppendContainer(parent);
    if (appendContainer) {
      const appendRid = appendContainer.getAttribute("data-wpt-rid");
      const originalAppend = appendRid ? document.querySelector(`[data-wpt-rid="${appendRid}"]`) as Element | null : null;

      if (!originalAppend || translatedElements.has(originalAppend) || appendedElementsInPass.has(originalAppend)) {
        continue;
      }

      const blockText = appendContainer.textContent?.trim() ?? "";
      if (blockText.length >= 2) {
        result.push({
          segmentId: `wpt-seg-${idx}`,
          text: blockText,
          xpath: getXPath(originalAppend),
          order: idx,
          element: originalAppend,
          renderMode: "append"
        });
        idx++;
        appendedElementsInPass.add(originalAppend);
      }
      continue;
    }

    // For replace mode, find the matching text node in the original element
    const originalTextNode = findMatchingTextNode(originalElement, text);
    result.push({
      segmentId: `wpt-seg-${idx}`,
      text,
      xpath: getTextNodeXPath(textNode),
      order: idx,
      element: originalElement,
      node: originalTextNode,
      renderMode: "replace"
    });
    idx++;
  }

  return result;
}

function findMatchingTextNode(element: Element, text: string): Text | undefined {
  for (const child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE && (child.nodeValue?.trim() ?? "") === text) {
      return child as Text;
    }
  }
  return undefined;
}

export function findTitleSegment(title: string, existingTexts: Set<string>): Segment | null {
  const trimmedTitle = title.trim();
  if (!trimmedTitle || trimmedTitle.length < 2) return null;
  if (existingTexts.has(trimmedTitle)) return null;

  const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
  for (const heading of headings) {
    if (heading.closest("nav, [role='navigation']")) continue;
    if (heading.textContent?.trim() === trimmedTitle) {
      return {
        segmentId: "wpt-seg-article-title",
        text: trimmedTitle,
        xpath: getXPath(heading),
        order: -1,
        element: heading,
        renderMode: "append"
      };
    }
  }

  return null;
}
