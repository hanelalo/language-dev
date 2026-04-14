import type { TranslateEngine, TranslateOptions } from "../../shared/types";

export function createOpenAIEngine(apiKey: string, model: string = "gpt-4o"): TranslateEngine {
  return {
    name: "openai",
    type: "llm",
    async translate(text, _sourceLang, _targetLang, _options?: TranslateOptions) {
      return `[OpenAI:${model}] ${text}`;
    },
    async batchTranslate(texts, _sourceLang, _targetLang, _options?: TranslateOptions) {
      return texts.map(t => `[OpenAI:${model}] ${t}`);
    },
    isConfigured() {
      return !!apiKey;
    }
  };
}
