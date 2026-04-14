import type { TranslateEngine, TranslateOptions } from "../../shared/types";

export function createDeepLEngine(apiKey: string): TranslateEngine {
  return {
    name: "deepl",
    type: "api",
    async translate(text, _sourceLang, _targetLang) {
      // Stub implementation
      return `[DeepL] ${text}`;
    },
    async batchTranslate(texts, _sourceLang, _targetLang) {
      return texts.map(t => `[DeepL] ${t}`);
    },
    isConfigured() {
      return !!apiKey;
    }
  };
}
