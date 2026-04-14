export type Settings = {
  sourceLang: string;
  targetLang: string;
  defaultEngine: string;
  selectionTranslate: boolean;
  currentDomain: string;
};

export const DEFAULT_SETTINGS: Settings = {
  sourceLang: "auto",
  targetLang: "zh-CN",
  defaultEngine: "deepl",
  selectionTranslate: true,
  currentDomain: "it"
};

