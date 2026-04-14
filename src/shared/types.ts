export type SegmentResult =
  | { status: "ok"; text: string }
  | { status: "failed"; error: string };

export type Segment = {
  segmentId: string;
  text: string;
  xpath?: string;
  order: number;
};

export interface TranslateEngine {
  name: string;
  type: "api" | "llm";
  translate(text: string, sourceLang: string, targetLang: string, options?: TranslateOptions): Promise<string>;
  batchTranslate(texts: string[], sourceLang: string, targetLang: string, options?: TranslateOptions): Promise<string[]>;
  isConfigured(): boolean;
}

export type TranslateOptions = {
  domainPrompt?: string;
  userInstruction?: string;
};