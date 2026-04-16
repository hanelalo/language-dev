export type Settings = {
  sourceLang: string;
  targetLang: string;
  defaultEngine: string;
  selectionTranslate: boolean;
  currentDomain: string;
  systemPrompt?: string; // 自定义系统提示词模板，支持 {{target_lang}}, {{source_lang}}
  glossaryPreScan?: boolean;
  glossaryPrompt?: string; // 自定义术语表预扫描提示词模板，支持 {{target_lang}}
};

export const DEFAULT_SETTINGS: Settings = {
  sourceLang: "auto",
  targetLang: "zh-CN",
  defaultEngine: "deepl",
  selectionTranslate: true,
  currentDomain: "it",
  systemPrompt: "",
  glossaryPreScan: false,
  glossaryPrompt: "",
};

