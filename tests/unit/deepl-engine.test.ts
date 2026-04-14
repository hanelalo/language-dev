import { describe, expect, it } from "vitest";
import { createDeepLEngine } from "../../src/background/engines/deepl-engine";

describe("DeepL Engine", () => {
  it("returns correct API endpoint", () => {
    const engine = createDeepLEngine("test-key");
    expect(engine.name).toBe("deepl");
    expect(engine.type).toBe("api");
  });

  it("isConfigured returns true when API key is set", () => {
    const engine = createDeepLEngine("valid-key");
    expect(engine.isConfigured()).toBe(true);
  });

  it("isConfigured returns false when API key is empty", () => {
    const engine = createDeepLEngine("");
    expect(engine.isConfigured()).toBe(false);
  });
});