import { handleTranslateBatch } from "./messages";
import { registerEngine, getEngine, listEngines } from "./engine-registry";
import { createDeepLEngine } from "./engines/deepl-engine";
import { createOpenAIEngine } from "./engines/openai-engine";
import { DEFAULT_SETTINGS } from "../shared/storage-schema";

// Register default engines
registerEngine(createDeepLEngine(""));
registerEngine(createOpenAIEngine(""));

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SUBMIT_SEGMENTS_BATCH") {
    handleTranslateBatch(message.payload)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // async response
  }
});

export { getEngine, listEngines, registerEngine };
