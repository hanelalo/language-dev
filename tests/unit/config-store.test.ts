import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSettings, saveSettings, BUILTIN_DOMAINS } from "../../src/background/config-store";

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

describe("BUILTIN_DOMAINS prompts", () => {
  const REQUIRED_SECTIONS = ["# Role", "# Task", "# Rules", "# Constraints", "# Examples"];
  const EXPECTED_IDS = ["it", "legal", "medical", "finance", "gaming", "literature", "academic", "news", "marketing"];

  it("has all 9 builtin domains", () => {
    expect(BUILTIN_DOMAINS.map(d => d.id)).toEqual(EXPECTED_IDS);
  });

  it("all domain prompts have structured markdown format", () => {
    for (const domain of BUILTIN_DOMAINS) {
      for (const section of REQUIRED_SECTIONS) {
        expect(domain.prompt, `Domain "${domain.id}" missing ${section}`).toContain(section);
      }
      expect(domain.prompt, `Domain "${domain.id}" missing language variable`).toContain("{{target_lang}}");
      expect(domain.prompt, `Domain "${domain.id}" missing source language variable`).toContain("{{source_lang}}");
    }
  });

  it("all domain prompts start with semantic fidelity rule", () => {
    for (const domain of BUILTIN_DOMAINS) {
      expect(domain.prompt, `Domain "${domain.id}" missing semantic fidelity rule`).toContain(
        "Preserve the original meaning precisely while ensuring natural, fluent expression in the target language"
      );
    }
  });

  it("all domain prompts use English for Role and Task sections", () => {
    for (const domain of BUILTIN_DOMAINS) {
      const roleTaskOnly = domain.prompt.split("# Rules")[0];
      expect(roleTaskOnly, `Domain "${domain.id}" Role/Task should be in English`).not.toMatch(/[\u4e00-\u9fff]/);
    }
  });
});
