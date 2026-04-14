import { describe, expect, it } from "vitest";
import { runBatchTranslate } from "../../src/background/translation-orchestrator";

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
