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

export type ArticleTranslateBatchPayload = TranslateBatchPayload & {
  articleTitle: string;
  articleText: string;
};

export type TranslateBatchResult = {
  results: SegmentResult[];
};

// Cache glossary result per article title to avoid re-scanning on every batch.
// Cleared automatically when the service worker restarts (MV3 lifecycle).
const glossaryCache = new Map<string, string | undefined>();

export function clearGlossaryCache(): void {
  glossaryCache.clear();
}

type ResolvedEngine = {
  engine: ReturnType<typeof getEngine> & { isConfigured: () => boolean; type: string };
  sourceLang: string;
  targetLang: string;
  domainPrompt: string | undefined;
  systemPrompt: string | undefined;
  glossaryGuide: string | undefined;
};

async function resolveEngine(
  payload: TranslateBatchPayload | ArticleTranslateBatchPayload
): Promise<ResolvedEngine | SegmentResult[]> {
  const settings = await getSettings();
  const sourceLang = payload.sourceLang ?? settings.sourceLang;
  const targetLang = payload.targetLang ?? settings.targetLang;
  const engineName = settings.defaultEngine;

  const engine = getEngine(engineName);
  if (!engine) {
    return payload.texts.map(() => ({
      status: "failed" as const,
      error: `Engine ${engineName} not found`,
    }));
  }

  if (!engine.isConfigured()) {
    return payload.texts.map(() => ({
      status: "failed" as const,
      error: `Engine ${engineName} not configured`,
    }));
  }

  let domainPrompt: string | undefined;
  if (settings.currentDomain && engine.type === "llm") {
    domainPrompt = await getDomainPrompt(settings.currentDomain) ?? undefined;
  }

  // Glossary pre-scan: only for article batches with LLM engines when setting is enabled.
  let glossaryGuide: string | undefined;
  if (
    settings.glossaryPreScan &&
    engine.type === "llm" &&
    "articleTitle" in payload
  ) {
    const articlePayload = payload as ArticleTranslateBatchPayload;
    glossaryGuide = glossaryCache.get(articlePayload.articleTitle);
    if (glossaryGuide === undefined && !glossaryCache.has(articlePayload.articleTitle)) {
      try {
        const glossaryUserMsg = buildGlossaryUserMessage(
          articlePayload.articleTitle,
          truncateArticleText(articlePayload.articleText)
        );
        glossaryGuide = await engine.translate(
          glossaryUserMsg,
          sourceLang,
          targetLang,
          {
            systemPrompt: buildGlossarySystemPrompt(targetLang, settings.glossaryPrompt),
            rawUserMessage: glossaryUserMsg,
          }
        );
      } catch {
        glossaryGuide = undefined;
      }
      glossaryCache.set(articlePayload.articleTitle, glossaryGuide);
    }
  }

  return { engine, sourceLang, targetLang, domainPrompt, systemPrompt: settings.systemPrompt, glossaryGuide };
}

export async function handleTranslateBatch(
  payload: TranslateBatchPayload
): Promise<TranslateBatchResult> {
  const resolved = await resolveEngine(payload);
  if (Array.isArray(resolved)) return { results: resolved };

  const { engine, sourceLang, targetLang, domainPrompt, systemPrompt, glossaryGuide } = resolved;

  // API engines (e.g. DeepL) support native batch — use a single call per batch.
  if (engine.type === "api") {
    try {
      const translations = await engine.batchTranslate(payload.texts, sourceLang, targetLang);
      const results: SegmentResult[] = translations.map(
        (text): SegmentResult => ({ status: "ok", text })
      );
      return { results };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "unknown error";
      return {
        results: payload.texts.map((): SegmentResult => ({ status: "failed", error: msg })),
      };
    }
  }

  // LLM engines: try structured batch first, then degrade to per-segment.
  const options = { systemPrompt, domainPrompt, glossaryGuide };

  // Attempt 1: structured batch
  try {
    const translations = await engine.batchTranslate(payload.texts, sourceLang, targetLang, options);
    const results: SegmentResult[] = translations.map(
      (text): SegmentResult => ({ status: "ok", text })
    );
    return { results };
  } catch {
    // Batch failed, continue to retry
  }

  // Attempt 2: retry batch once
  try {
    const translations = await engine.batchTranslate(payload.texts, sourceLang, targetLang, options);
    const results: SegmentResult[] = translations.map(
      (text): SegmentResult => ({ status: "ok", text })
    );
    return { results };
  } catch {
    // Batch retry failed, continue to degradation
  }

  // Degradation: per-segment translation with concurrency control and retry.
  const worker = async (text: string): Promise<string> => {
    return engine.translate(text, sourceLang, targetLang, options);
  };

  const results = await runBatchTranslateWithRetry(payload.texts, worker, {
    maxRetries: 2,
    baseDelayMs: 500,
  });

  return { results };
}

export async function handleArticleTranslateBatch(
  payload: ArticleTranslateBatchPayload
): Promise<TranslateBatchResult> {
  // Article batch shares the same logic as regular batch;
  // the only difference is glossary pre-scan, which is handled in resolveEngine.
  return handleTranslateBatch(payload);
}
