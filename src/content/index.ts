import { extractSegments } from "./dom-extractor";
import { renderTranslationBlock } from "./translation-renderer";
import { MESSAGE_TYPES } from "../shared/constants";
import type { Segment } from "./dom-extractor";

let segments: Segment[] = [];

export async function runPageTranslationFlow(): Promise<{ total: number; completed: number; failed: number }> {
  segments = extractSegments();

  if (segments.length === 0) {
    return { total: 0, completed: 0, failed: 0 };
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
            renderTranslationBlock(segment, result.text);
            completed++;
          } else {
            renderTranslationBlock(segment, "", "failed");
            failed++;
          }
        }
      } else {
        for (const segment of batch) {
          renderTranslationBlock(segment, "", "failed");
          failed++;
        }
      }
    } catch {
      for (const segment of batch) {
        renderTranslationBlock(segment, "", "failed");
        failed++;
      }
    }
  }

  return { total: segments.length, completed, failed };
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
