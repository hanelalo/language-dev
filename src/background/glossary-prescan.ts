const MAX_ARTICLE_LENGTH = 8000;

export const GLOSSARY_SYSTEM_PROMPT = `Analyze the following article text and produce a concise translation glossary guide.

Output a list of terms that should be handled consistently when translating, in this format:
- Term → translation / keep original (reason)

Categories to identify:
1. Proper nouns (people, places, organizations) — keep original unless a well-known translation exists
2. Technical terms and jargon — keep original or use standard translated term
3. Brand names and product names — keep original
4. Acronyms and abbreviations — keep original

Rules:
- Only list terms that appear multiple times or are important for translation consistency
- Keep the guide concise — max 50 terms
- If a term should be translated, provide the target language translation
- Output ONLY the glossary, no explanations

Target language: {{target_lang}}`;

export function buildGlossarySystemPrompt(targetLang: string): string {
  return GLOSSARY_SYSTEM_PROMPT.replace(/\{\{target_lang\}\}/g, targetLang);
}

export function buildGlossaryUserMessage(title: string, articleText: string): string {
  return `Title: ${title}\n\n${articleText}`;
}

export function truncateArticleText(text: string, maxLength: number = MAX_ARTICLE_LENGTH): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "\n[...truncated]";
}
