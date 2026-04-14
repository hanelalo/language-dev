import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../../src/shared/storage-schema";

describe("storage schema", () => {
  it("has expected default target language", () => {
    expect(DEFAULT_SETTINGS.targetLang).toBe("zh-CN");
  });
});