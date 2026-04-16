import { getSettings, getDomainPrompt } from "./config-store";
import { getEngine } from "./engine-registry";
import { runBatchTranslateWithRetry } from "./translation-orchestrator";
import type { SegmentResult } from "./translation-orchestrator";
import { truncateArticleText, buildGlossarySystemPrompt, buildGlossaryUserMessage } from "./glossary-prescan";

export type TranslateBatchPayload = {
  texts: string[];
  sourceLang?: string;
  targetLang?: string;
};

export type TranslateBatchResult = {
  results: SegmentResult[];
};

export async function handleTranslateBatch(
  payload: TranslateBatchPayload
): Promise<TranslateBatchResult> {
  const settings = await getSettings();
  const sourceLang = payload.sourceLang ?? settings.sourceLang;
  const targetLang = payload.targetLang ?? settings.targetLang;
  const engineName = settings.defaultEngine;

  const engine = getEngine(engineName);
  if (!engine) {
    return {
      results: payload.texts.map(() => ({
        status: "failed" as const,
        error: `Engine ${engineName} not found`,
      })),
    };
  }

  if (!engine.isConfigured()) {
    return {
      results: payload.texts.map(() => ({
        status: "failed" as const,
        error: `Engine ${engineName} not configured`,
      })),
    };
  }

  // Get domain prompt if set and engine is LLM
  let domainPrompt: string | undefined;
  if (settings.currentDomain && engine.type === "llm") {
    domainPrompt = await getDomainPrompt(settings.currentDomain) ?? undefined;
  }

  // Get system prompt template from settings
  const systemPrompt = settings.systemPrompt;

  const worker = async (text: string): Promise<string> => {
    if (engine.type === "llm") {
      return engine.translate(text, sourceLang, targetLang, { systemPrompt, domainPrompt });
    }
    return engine.translate(text, sourceLang, targetLang);
  };

  const results = await runBatchTranslateWithRetry(payload.texts, worker, {
    maxRetries: 2,
    baseDelayMs: 500,
  });

  return { results };
}

export type ArticleTranslateBatchPayload = TranslateBatchPayload & {
  articleTitle: string;
  articleText: string;
};

export async function handleArticleTranslateBatch(
  payload: ArticleTranslateBatchPayload
): Promise<TranslateBatchResult> {
  const settings = await getSettings();
  const sourceLang = payload.sourceLang ?? settings.sourceLang;
  const targetLang = payload.targetLang ?? settings.targetLang;
  const engineName = settings.defaultEngine;

  const engine = getEngine(engineName);
  if (!engine) {
    return {
      results: payload.texts.map(() => ({
        status: "failed" as const,
        error: `Engine ${engineName} not found`,
      })),
    };
  }

  if (!engine.isConfigured()) {
    return {
      results: payload.texts.map(() => ({
        status: "failed" as const,
        error: `Engine ${engineName} not configured`,
      })),
    };
  }

  let domainPrompt: string | undefined;
  if (settings.currentDomain && engine.type === "llm") {
    domainPrompt = await getDomainPrompt(settings.currentDomain) ?? undefined;
  }

  const systemPrompt = settings.systemPrompt;

  // Glossary pre-scan: only for LLM engines with setting enabled
  // Reuses engine.translate() with the glossary prompt as system prompt.
  // The LLM follows system prompt instructions regardless of the user prompt wrapper.
  let glossaryGuide: string | undefined;
  if (settings.glossaryPreScan && engine.type === "llm") {
    try {
      const glossaryUserMsg = buildGlossaryUserMessage(
        payload.articleTitle,
        truncateArticleText(payload.articleText)
      );
      glossaryGuide = await engine.translate(
        glossaryUserMsg,
        sourceLang,
        targetLang,
        { systemPrompt: buildGlossarySystemPrompt(targetLang, settings.glossaryPrompt) }
      );
    } catch {
      // Pre-scan failed — fall back to normal translation without glossary
      glossaryGuide = undefined;
    }
  }

  const worker = async (text: string): Promise<string> => {
    if (engine.type === "llm") {
      return engine.translate(text, sourceLang, targetLang, { systemPrompt, domainPrompt, glossaryGuide });
    }
    return engine.translate(text, sourceLang, targetLang);
  };

  const results = await runBatchTranslateWithRetry(payload.texts, worker, {
    maxRetries: 2,
    baseDelayMs: 500,
  });

  return { results };
}
