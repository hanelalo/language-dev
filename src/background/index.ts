import { handleTranslateBatch, handleArticleTranslateBatch } from "./messages";
import { registerEngine, getEngine, listEngines } from "./engine-registry";
import { createDeepLEngine } from "./engines/deepl-engine";
import { createOpenAIEngine } from "./engines/openai-engine";
import { createCustomLLMEngine } from "./engines/custom-llm-engine";
import { getSettings, getEngineConfig, getCustomApis } from "./config-store";
import { MESSAGE_TYPES } from "../shared/constants";

// Register default engines (without API keys initially)
registerEngine(createDeepLEngine(""));
registerEngine(createOpenAIEngine(""));

// Track initialization state for MV3 Service Worker cold start safety.
// The message listener will wait for initialization before handling requests.
let engineInitPromise: Promise<void> | null = null;

function ensureEnginesInitialized(): Promise<void> {
  if (engineInitPromise) return engineInitPromise;

  engineInitPromise = (async () => {
    const [deeplConfig, openaiConfig, customApis] = await Promise.all([
      getEngineConfig("deepl"),
      getEngineConfig("openai"),
      getCustomApis(),
    ]);

    if (deeplConfig.apiKey) {
      registerEngine(createDeepLEngine(deeplConfig.apiKey, (deeplConfig.plan as "free" | "pro") ?? "free"));
    }
    if (openaiConfig.apiKey) {
      registerEngine(createOpenAIEngine(openaiConfig.apiKey, openaiConfig.model ?? "gpt-4o"));
    }
    for (const api of customApis) {
      if (api.apiKey && api.baseUrl) {
        registerEngine(createCustomLLMEngine(api.name, api.apiKey, api.model, api.baseUrl));
      }
    }
  })();

  return engineInitPromise;
}

// Kick off initialization immediately (non-blocking)
ensureEnginesInitialized();

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === MESSAGE_TYPES.SUBMIT_SEGMENTS_BATCH) {
    // Ensure engines are initialized (handles MV3 cold start race condition)
    ensureEnginesInitialized()
      .then(() => handleTranslateBatch(message.payload))
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // async response
  }

  if (message.type === MESSAGE_TYPES.SUBMIT_ARTICLE_BATCH) {
    // Ensure engines are initialized (handles MV3 cold start race condition)
    ensureEnginesInitialized()
      .then(() => handleArticleTranslateBatch(message.payload))
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // async response
  }

  if (message.type === MESSAGE_TYPES.START_PAGE_TRANSLATION) {
    // Forward to content script to start extraction
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: MESSAGE_TYPES.START_PAGE_TRANSLATION });
      }
    });
  }
});

export { getEngine, listEngines, registerEngine };
