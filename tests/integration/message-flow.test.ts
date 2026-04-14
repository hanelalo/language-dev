import { describe, expect, it } from "vitest";
import { handleTranslateBatch } from "../../src/background/messages";

describe("handleTranslateBatch", () => {
  it("exists and is a function", () => {
    expect(typeof handleTranslateBatch).toBe("function");
  });
});
