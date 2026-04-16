import { describe, expect, it } from "vitest";
import { truncateArticleText, buildGlossarySystemPrompt, buildGlossaryUserMessage } from "../../src/background/glossary-prescan";

describe("glossary-prescan", () => {
  describe("truncateArticleText", () => {
    it("returns text as-is when under limit", () => {
      const text = "Short article.";
      expect(truncateArticleText(text, 100)).toBe(text);
    });

    it("truncates and appends marker when over limit", () => {
      const text = "a".repeat(100);
      expect(truncateArticleText(text, 50)).toBe("a".repeat(50) + "\n[...truncated]");
    });

    it("uses default limit of 8000", () => {
      const short = "short";
      expect(truncateArticleText(short)).toBe(short);
    });
  });

  describe("buildGlossarySystemPrompt", () => {
    it("replaces {{target_lang}} in system prompt", () => {
      const prompt = buildGlossarySystemPrompt("zh-CN");
      expect(prompt).toContain("Target language: zh-CN");
      expect(prompt).not.toContain("{{target_lang}}");
    });
  });

  describe("buildGlossaryUserMessage", () => {
    it("includes title in user message", () => {
      const msg = buildGlossaryUserMessage("My Title", "Some body text");
      expect(msg).toContain("Title: My Title");
      expect(msg).toContain("Some body text");
    });
  });
});
