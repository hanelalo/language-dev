import type { TranslateEngine, TranslateOptions } from "../../shared/types";
import { buildSystemPrompt } from "../prompt-builder";

export function createOpenAIEngine(apiKey: string, model: string = "gpt-4o"): TranslateEngine {
  return {
    name: "openai",
    type: "llm",
    async translate(text, sourceLang, targetLang, options?: TranslateOptions) {
      const _prompt = buildSystemPrompt({
        basePrompt: `Translate from ${sourceLang} to ${targetLang}`,
        domainPrompt: options?.domainPrompt,
        userInstruction: options?.userInstruction
      });
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
