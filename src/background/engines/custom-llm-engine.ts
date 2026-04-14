import type { TranslateEngine, TranslateOptions } from "../../shared/types";

export function createCustomLLMEngine(
  apiKey: string,
  model: string,
  baseUrl: string
): TranslateEngine {
  return {
    name: "custom-llm",
    type: "llm",

    async translate(
      text: string,
      _sourceLang: string,
      targetLang: string,
      options?: TranslateOptions
    ): Promise<string> {
      const systemPrompt = buildSystemPrompt(targetLang, options?.domainPrompt, options?.userInstruction);
      return callCustomLLMAPI(apiKey, baseUrl, model, systemPrompt, text);
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

function buildSystemPrompt(targetLang: string, domainPrompt?: string, userInstruction?: string): string {
  const parts = [
    `You are a professional translator. Translate the following text to ${targetLang}.`,
    domainPrompt,
    userInstruction,
  ].filter(Boolean).join("\n\n");
  return parts;
}

async function callCustomLLMAPI(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userText: string
): Promise<string> {
  // Ensure baseUrl doesn't end with /chat/completions
  const endpoint = baseUrl.endsWith("/chat/completions")
    ? baseUrl
    : `${baseUrl}/chat/completions`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
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
    throw new Error(`Custom LLM API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}
