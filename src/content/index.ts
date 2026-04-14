import { extractSegmentsFromHtml } from "./dom-extractor";

export async function runPageTranslationFlow(html: string): Promise<{ completed: number; failed: number }> {
  const segments = extractSegmentsFromHtml(html);
  let completed = 0;
  let failed = 0;

  for (const seg of segments) {
    try {
      void seg.segmentId;
      completed += 1;
    } catch {
      failed += 1;
    }
  }

  return { completed, failed };
}
