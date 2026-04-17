import { DEFAULT_SYSTEM_PROMPT } from "./openai-engine";

/**
 * Build the system prompt for LLM-based engines.
 * Variable substitution: {{target_lang}}, {{source_lang}}, {{domain_prompt}}
 */
export function buildSystemPrompt(
  runtimePrompt: string | undefined,
  customPrompt: string | undefined,
  sourceLang: string,
  targetLang: string,
  domainPrompt?: string,
  glossaryGuide?: string
): string {
  const template = runtimePrompt || customPrompt || DEFAULT_SYSTEM_PROMPT;
  const prompt = template
    .replace(/\{\{target_lang\}\}/g, targetLang)
    .replace(/\{\{source_lang\}\}/g, sourceLang)
    .replace(/\{\{domain_prompt\}\}/g, domainPrompt ?? "");

  let result: string;

  if (domainPrompt && !template.includes("{{domain_prompt}}")) {
    result = `${prompt}\n\n${domainPrompt}`.trim();
  } else {
    result = prompt.trim();
  }

  if (glossaryGuide?.trim()) {
    result += `\n\n# Article-Specific Glossary Guide\n\n${glossaryGuide.trim()}`;
  }

  return result;
}

export function buildUserPrompt(text: string, sourceLang: string, targetLang: string): string {
  return [
    `Translate the following text from ${sourceLang} to ${targetLang}.`,
    "Return only the translated text, with no explanation, notes, or extra words.",
    "",
    "Source text:",
    text
  ].join("\n");
}

export function buildBatchUserPrompt(
  texts: string[],
  sourceLang: string,
  targetLang: string
): string {
  const inputJson = JSON.stringify(
    texts.map((text, i) => ({ index: i + 1, text }))
  );

  return [
    `Translate the following texts from ${sourceLang} to ${targetLang}.`,
    "",
    `Return ONLY a JSON array of objects with "index" and "text" fields. No explanation, no markdown, no extra text.`,
    `The array must have exactly ${texts.length} elements. Keep the "index" values unchanged, translate only the "text" field.`,
    "",
    `Example output format:`,
    `[{"index": 1, "text": "translated1"}, {"index": 2, "text": "translated2"}]`,
    "",
    `Input:`,
    inputJson,
    "",
    `Output:`,
  ].join("\n");
}
