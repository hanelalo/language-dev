import type { TranslateEngine, TranslateOptions } from "../../shared/types";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export function createOpenAIEngine(
  apiKey: string,
  model: string = "gpt-4o",
  baseUrl: string = OPENAI_API_URL
): TranslateEngine {
  return {
    name: "openai",
    type: "llm",

    async translate(
      text: string,
      _sourceLang: string,
      targetLang: string,
      options?: TranslateOptions
    ): Promise<string> {
      const systemPrompt = buildSystemPrompt(targetLang, options?.domainPrompt, options?.userInstruction);
      return callOpenAIAPI(apiKey, baseUrl, model, systemPrompt, text);
    },

    async batchTranslate(
      texts: string[],
      sourceLang: string,
      targetLang: string,
      options?: TranslateOptions
    ): Promise<string[]> {
      // Translate each text individually for better quality
      const results: string[] = [];
      for (const text of texts) {
        const translated = await this.translate(text, sourceLang, targetLang, options);
        results.push(translated);
      }
      return results;
    },

    isConfigured(): boolean {
      return !!apiKey;
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

async function callOpenAIAPI(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userText: string
): Promise<string> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
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
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}