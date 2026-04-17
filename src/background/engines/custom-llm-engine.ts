import type { TranslateEngine, TranslateOptions } from "../../shared/types";
import { buildSystemPrompt, buildUserPrompt } from "./prompt-utils";

export function createCustomLLMEngine(
  name: string,
  apiKey: string,
  model: string,
  baseUrl: string,
  customPrompt?: string
): TranslateEngine {
  return {
    name: `custom-llm-${name}`,
    type: "llm",

    async translate(
      text: string,
      sourceLang: string,
      targetLang: string,
      options?: TranslateOptions
    ): Promise<string> {
      const systemPrompt = buildSystemPrompt(
        options?.systemPrompt,
        customPrompt,
        sourceLang,
        targetLang,
        options?.domainPrompt,
        options?.glossaryGuide
      );
      const userPrompt = options?.rawUserMessage ?? buildUserPrompt(text, sourceLang, targetLang);
      return callCustomLLMAPI(apiKey, baseUrl, model, systemPrompt, userPrompt);
    },

    async batchTranslate(
      texts: string[],
      sourceLang: string,
      targetLang: string,
      options?: TranslateOptions
    ): Promise<string[]> {
      const results: string[] = [];
      for (const text of texts) {
        const translated = await this.translate(text, sourceLang, targetLang, options);
        results.push(translated);
      }
      return results;
    },

    isConfigured(): boolean {
      return !!apiKey && !!baseUrl;
    }
  };
}

async function callCustomLLMAPI(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userText: string
): Promise<string> {
  const endpoint = baseUrl.endsWith("/chat/completions")
    ? baseUrl
    : `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

  console.log("[WPT CustomLLM] request:", endpoint, "model:", model);
  console.log("[WPT CustomLLM] system prompt:", systemPrompt);
  console.log("[WPT CustomLLM] user message:", userText);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[WPT CustomLLM] error:", response.status, error);
    throw new Error(`Custom LLM API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const result = data.choices[0].message.content.trim();
  console.log("[WPT CustomLLM] response:", result);
  return result;
}
