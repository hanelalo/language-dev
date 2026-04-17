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
  systemPrompt?: string; // 自定义系统提示词模板
  domainPrompt?: string; // 领域提示词
  glossaryGuide?: string;
  /** When set, used directly as the user message instead of the default translation wrapper. */
  rawUserMessage?: string;
};
