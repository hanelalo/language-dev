export type SegmentResult =
  | { status: "ok"; text: string }
  | { status: "failed"; error: string };

export async function runBatchTranslate(
  texts: string[],
  worker: (text: string) => Promise<string>
): Promise<SegmentResult[]> {
  const results: SegmentResult[] = [];

  for (const text of texts) {
    try {
      const value = await worker(text);
      results.push({ status: "ok", text: value });
    } catch (error) {
      results.push({
        status: "failed",
        error: error instanceof Error ? error.message : "unknown error"
      });
    }
  }

  return results;
}
