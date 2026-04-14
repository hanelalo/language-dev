export type Segment = { segmentId: string; text: string; order: number };

const SKIP_TAGS = new Set(["CODE", "PRE", "SCRIPT", "STYLE", "INPUT", "TEXTAREA"]);

export function extractSegmentsFromHtml(html: string): Segment[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const nodes = Array.from(doc.body.querySelectorAll("p,div,span,li,td,h1,h2,h3,h4,h5,h6,a"));
  const result: Segment[] = [];
  let idx = 0;

  for (const node of nodes) {
    if (SKIP_TAGS.has(node.tagName)) continue;
    if (node.closest('code,pre,script,style,input,textarea,[translate="no"]')) continue;
    const text = node.textContent?.trim() ?? "";
    if (!text) continue;
    result.push({ segmentId: `seg-${idx}`, text, order: idx });
    idx += 1;
  }

  return result;
}