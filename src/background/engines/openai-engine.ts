import type { TranslateEngine, TranslateOptions } from "../../shared/types";

const OPENAI_API_BASE_URL = "https://api.openai.com/v1";

// 默认提示词模板
export const DEFAULT_SYSTEM_PROMPT = `You are a professional translator. Translate the following text to {{target_lang}}.

Requirements:
- Maintain the original tone and style
- Preserve technical terms and abbreviations
- Keep the same formatting as the source text`;

export function createOpenAIEngine(
  apiKey: string,
  model: string = "gpt-4o",
  baseUrl: string = OPENAI_API_BASE_URL,
  customPrompt?: string
): TranslateEngine {
  return {
    name: "openai",
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
        options?.domainPrompt
      );
      const userPrompt = buildUserPrompt(text, sourceLang, targetLang);
      return callOpenAIAPI(apiKey, baseUrl, model, systemPrompt, userPrompt);
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

/**
 * 使用变量替换构建提示词
 * 支持的变量: {{target_lang}}, {{source_lang}}, {{domain_prompt}}
 */
function buildSystemPrompt(
  runtimePrompt: string | undefined,
  customPrompt: string | undefined,
  sourceLang: string,
  targetLang: string,
  domainPrompt?: string
): string {
  const template = runtimePrompt || customPrompt || DEFAULT_SYSTEM_PROMPT;
  const prompt = template
    .replace(/\{\{target_lang\}\}/g, targetLang)
    .replace(/\{\{source_lang\}\}/g, sourceLang)
    .replace(/\{\{domain_prompt\}\}/g, domainPrompt ?? "");

  if (domainPrompt && !template.includes("{{domain_prompt}}")) {
    return `${prompt}\n\n${domainPrompt}`.trim();
  }

  return prompt.trim();
}

function buildUserPrompt(text: string, sourceLang: string, targetLang: string): string {
  return [
    `Translate the following text from ${sourceLang} to ${targetLang}.`,
    "Return only the translated text, with no explanation, notes, or extra words.",
    "",
    "Source text:",
    text
  ].join("\n");
}

async function callOpenAIAPI(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userText: string
): Promise<string> {
  const endpoint = baseUrl.endsWith("/chat/completions")
    ? baseUrl
    : `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

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
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}
