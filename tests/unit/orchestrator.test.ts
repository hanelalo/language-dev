import { describe, expect, it, vi, beforeEach } from "vitest";
import { runBatchTranslate, runBatchTranslateWithRetry } from "../../src/background/translation-orchestrator";

describe("runBatchTranslate", () => {
  it("continues when one segment fails", async () => {
    const result = await runBatchTranslate(["a", "b"], async (text) => {
      if (text === "a") throw new Error("fail");
      return "B";
    });
    expect(result[0].status).toBe("failed");
    expect(result[1].status).toBe("ok");
  });
});

describe("runBatchTranslateWithRetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retries failed segments with exponential backoff", async () => {
    let attempts = 0;
    const worker = async (text: string) => {
      attempts++;
      if (text === "fail" && attempts < 3) throw new Error("temporary error");
      return `translated: ${text}`;
    };

    const results = await runBatchTranslateWithRetry(["ok", "fail"], worker);

    expect(results[0].status).toBe("ok");
    expect(results[1].status).toBe("ok");
    expect(attempts).toBe(3); // initial + 2 retries
  });

  it("gives up after max retries and marks as failed", async () => {
    const worker = async (_text: string) => {
      throw new Error("permanent error");
    };

    const results = await runBatchTranslateWithRetry(["text"], worker, {
      maxRetries: 2,
      baseDelayMs: 10
    });

    expect(results[0].status).toBe("failed");
    expect(results[0].error).toBe("permanent error");
  });

  it("does not retry if already succeeds", async () => {
    let attempts = 0;
    const worker = async (_text: string) => {
      attempts++;
      return "ok";
    };

    await runBatchTranslateWithRetry(["a", "b"], worker, { maxRetries: 2 });
    expect(attempts).toBe(2); // no retries needed
  });
});
