export type SegmentResult =
  | { status: "ok"; text: string }
  | { status: "failed"; error: string };

export type RetryOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
  concurrency?: number;
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

async function runWithConcurrency<T>(
  items: T[],
  fn: (item: T) => Promise<SegmentResult>,
  concurrency: number
): Promise<SegmentResult[]> {
  const results: SegmentResult[] = new Array(items.length);
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runNext());
  await Promise.all(workers);
  return results;
}

export async function runBatchTranslateWithRetry(
  texts: string[],
  worker: (text: string) => Promise<string>,
  options: RetryOptions = {}
): Promise<SegmentResult[]> {
  const { maxRetries = 2, baseDelayMs = 500, concurrency = 5 } = options;

  return runWithConcurrency(texts, (text) => translateWithRetry(text, worker, maxRetries, baseDelayMs), concurrency);
}

export async function runBatchTranslate(
  texts: string[],
  worker: (text: string) => Promise<string>
): Promise<SegmentResult[]> {
  return runBatchTranslateWithRetry(texts, worker, { maxRetries:0 });
}
