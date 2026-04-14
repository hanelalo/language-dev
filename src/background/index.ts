import { handleTranslateBatch } from "./messages";
import { registerEngine, getEngine, listEngines } from "./engine-registry";
import { createDeepLEngine } from "./engines/deepl-engine";
import { createOpenAIEngine } from "./engines/openai-engine";
import { createCustomLLMEngine } from "./engines/custom-llm-engine";
import { getSettings, getEngineConfig, getCustomApis } from "./config-store";
import { MESSAGE_TYPES } from "../shared/constants";

// Register default engines (without API keys initially)
registerEngine(createDeepLEngine(""));
registerEngine(createOpenAIEngine(""));

// Load API keys from storage and update engines
async function initializeEngines() {
  const deeplConfig = await getEngineConfig("deepl");
  if (deeplConfig.apiKey) {
    registerEngine(createDeepLEngine(deeplConfig.apiKey, (deeplConfig.plan as "free" | "pro") ?? "free"));
  }
  const openaiConfig = await getEngineConfig("openai");
  if (openaiConfig.apiKey) {
    registerEngine(createOpenAIEngine(openaiConfig.apiKey, openaiConfig.model ?? "gpt-4o"));
  }

  // Load and register all custom APIs
  const customApis = await getCustomApis();
  for (const api of customApis) {
    if (api.apiKey && api.baseUrl) {
      registerEngine(createCustomLLMEngine(api.name, api.apiKey, api.model, api.baseUrl));
    }
  }
}

initializeEngines();

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === MESSAGE_TYPES.SUBMIT_SEGMENTS_BATCH) {
    handleTranslateBatch(message.payload)
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
