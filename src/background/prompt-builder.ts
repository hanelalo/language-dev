type PromptInput = {
  basePrompt: string;
  domainPrompt?: string;
  userInstruction?: string;
  glossaryGuide?: string;
};

export function buildSystemPrompt(input: PromptInput): string {
  const parts = [input.basePrompt, input.domainPrompt, input.userInstruction]
    .map((v) => (v ?? "").trim())
    .filter(Boolean);

  let prompt = parts.join("\n\n");

  if (input.glossaryGuide?.trim()) {
    prompt += `\n\n# Article-Specific Glossary Guide\n\n${input.glossaryGuide.trim()}`;
  }

  return prompt.trim();
}
