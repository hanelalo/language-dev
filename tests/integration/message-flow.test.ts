import { describe, expect, it } from "vitest";
import { handleTranslateBatch } from "../../src/background/messages";

describe("message flow", () => {
  it("returns batch result with per-segment status", async () => {
    const result = await handleTranslateBatch({ texts: ["hello"] });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].status).toBe("ok");
  });
});
