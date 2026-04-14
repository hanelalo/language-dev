import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSettings, saveSettings } from "../../src/background/config-store";

describe("config-store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads default settings when storage is empty", async () => {
    const mockGet = vi.fn((keys, cb) => cb({}));
    chrome.storage.local.get = mockGet;

    const settings = await getSettings();
    expect(settings.targetLang).toBe("zh-CN");
    expect(settings.defaultEngine).toBe("deepl");
  });

  it("saves settings to storage", async () => {
    const mockSet = vi.fn((data, cb) => cb());
    chrome.storage.local.set = mockSet;

    await saveSettings({ targetLang: "en", defaultEngine: "openai" });
    expect(mockSet).toHaveBeenCalled();
  });
});
