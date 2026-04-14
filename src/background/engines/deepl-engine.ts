import type { TranslateEngine, TranslateOptions } from "../../shared/types";

const DEEPL_API_URL = "https://api-free.deepl.com/v2/translate";
const DEEPL_PRO_URL = "https://api.deepl.com/v2/translate";

export function createDeepLEngine(apiKey: string, plan: "free" | "pro" = "free"): TranslateEngine {
  const baseUrl = plan === "free" ? DEEPL_API_URL : DEEPL_PRO_URL;

  return {
    name: "deepl",
    type: "api",

    async translate(text: string, sourceLang: string, targetLang: string, _options?: TranslateOptions): Promise<string> {
      const result = await callDeepLAPI(apiKey, baseUrl, [text], sourceLang, targetLang);
      return result[0];
    },

    async batchTranslate(texts: string[], sourceLang: string, targetLang: string, _options?: TranslateOptions): Promise<string[]> {
      return callDeepLAPI(apiKey, baseUrl, texts, sourceLang, targetLang);
    },

    isConfigured(): boolean {
      return !!apiKey;
    }
  };
}

async function callDeepLAPI(
  apiKey: string,
  baseUrl: string,
  texts: string[],
  sourceLang: string,
  targetLang: string
): Promise<string[]> {
  const params = new URLSearchParams({
    auth_key: apiKey,
    text: texts.join("\n"),
    target_lang: targetLang,
  });

  if (sourceLang !== "auto") {
    params.set("source_lang", sourceLang);
  }

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepL API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // DeepL returns translations joined by \n for batch
  if (texts.length > 1) {
    return data.translations.map((t: any) => t.text);
  }

  return [data.translations[0].text];
}