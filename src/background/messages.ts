import { getSettings, getEngineConfig, getDomainPrompt } from "./config-store";
import { getEngine } from "./engine-registry";
import { runBatchTranslateWithRetry } from "./translation-orchestrator";
import type { SegmentResult } from "./translation-orchestrator";

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

  const worker = async (text: string): Promise<string> => {
    if (engine.type === "llm") {
      return engine.translate(text, sourceLang, targetLang, { domainPrompt });
    }
    return engine.translate(text, sourceLang, targetLang);
  };

  const results = await runBatchTranslateWithRetry(payload.texts, worker, {
    maxRetries: 2,
    baseDelayMs: 500,
  });

  return { results };
}
