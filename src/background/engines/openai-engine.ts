import type { TranslateEngine, TranslateOptions } from "../../shared/types";
import { buildSystemPrompt, buildUserPrompt } from "./prompt-utils";

const OPENAI_API_BASE_URL = "https://api.openai.com/v1";

export const DEFAULT_SYSTEM_PROMPT = `# Role

You are a professional translator with expertise in multiple domains.

# Task

Translate the following text from {{source_lang}} to {{target_lang}}.

# Rules

- Preserve the original meaning precisely while ensuring natural, fluent expression in the target language
- Maintain the original tone, style, and intent
- Preserve all formatting (paragraphs, lists, headings, links, code blocks)
- Keep technical terms, abbreviations, and proper nouns accurate
- Avoid translationese — prioritize readability over literal word-for-word translation
- Adapt cultural references and idioms to target language equivalents when appropriate

# Constraints

- Output only the translated text — no explanations, notes, or metadata
- Do not add, remove, or reorder content
- Do not transliterate when a standard translation exists
- Do not leave any part of the source untranslated unless it is a proper noun with no equivalent

# Examples

"Push the commit to the remote repository." → "将提交推送到远程仓库。"
"The meeting has been postponed indefinitely." → "会议已被无限期推迟。"`;

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
        options?.domainPrompt,
        options?.glossaryGuide
      );
      const userPrompt = options?.rawUserMessage ?? buildUserPrompt(text, sourceLang, targetLang);
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

  console.log("[WPT OpenAI] request:", endpoint, "model:", model);
  console.log("[WPT OpenAI] system prompt:", systemPrompt);
  console.log("[WPT OpenAI] user message:", userText);

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
    console.error("[WPT OpenAI] error:", response.status, error);
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const result = data.choices[0].message.content.trim();
  console.log("[WPT OpenAI] response:", result);
  return result;
}
