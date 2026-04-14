import { extractSegmentsFromHtml } from "./dom-extractor";

export async function runPageTranslationFlow(html: string): Promise<{ completed: number; failed: number }> {
  const segments = extractSegmentsFromHtml(html);
  let completed = 0;
  let failed = 0;

  for (const seg of segments) {
    // TODO: Submit to background for translation via chrome.runtime.sendMessage
    void seg.segmentId; // Placeholder - actual translation pending integration
    completed += 1;
  }

  return { completed, failed };
}
