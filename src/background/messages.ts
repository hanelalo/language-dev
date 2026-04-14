import { runBatchTranslate } from "./translation-orchestrator";

export async function handleTranslateBatch(payload: { texts: string[] }) {
  const results = await runBatchTranslate(payload.texts, async (text) => `${text} (translated)`);
  return { results };
}
