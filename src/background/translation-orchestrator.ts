export type SegmentResult =
  | { status: "ok"; text: string }
  | { status: "failed"; error: string };

export type RetryOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
};

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function translateWithRetry(
  text: string,
  worker: (text: string) => Promise<string>,
  maxRetries: number,
  baseDelayMs: number
): Promise<SegmentResult> {
  let lastError: string = "unknown error";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const translated = await worker(text);
      return { status: "ok", text: translated };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "unknown error";
      if (attempt < maxRetries) {
        // Exponential backoff: baseDelay * 2^attempt
        const delay = baseDelayMs * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  return { status: "failed", error: lastError };
}

export async function runBatchTranslateWithRetry(
  texts: string[],
  worker: (text: string) => Promise<string>,
  options: RetryOptions = {}
): Promise<SegmentResult[]> {
  const { maxRetries = 2, baseDelayMs = 500 } = options;

  const results = await Promise.all(
    texts.map((text) => translateWithRetry(text, worker, maxRetries, baseDelayMs))
  );

  return results;
}

export async function runBatchTranslate(
  texts: string[],
  worker: (text: string) => Promise<string>
): Promise<SegmentResult[]> {
  return runBatchTranslateWithRetry(texts, worker, { maxRetries: 0 });
}
