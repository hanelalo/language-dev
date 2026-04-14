type PromptInput = {
  basePrompt: string;
  domainPrompt?: string;
  userInstruction?: string;
};

export function buildSystemPrompt(input: PromptInput): string {
  const parts = [input.basePrompt, input.domainPrompt, input.userInstruction]
    .map((v) => (v ?? "").trim())
    .filter(Boolean);
  return parts.join("\n\n");
}
