import type { Settings } from "../shared/types";
import { DEFAULT_SETTINGS } from "../shared/storage-schema";

export type CustomLLMConfig = {
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
};

export async function getSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["settings"], (result) => {
      resolve(result.settings ?? DEFAULT_SETTINGS);
    });
  });
}

export async function saveSettings(settings: Settings): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ settings }, resolve);
  });
}

export async function getEngineConfig(engineName: string): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["engines"], (result) => {
      resolve(result.engines?.[engineName] ?? {});
    });
  });
}

export async function saveEngineConfig(
  engineName: string,
  config: Record<string, string>
): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["engines"], (result) => {
      const engines = result.engines ?? {};
      engines[engineName] = { ...engines[engineName], ...config };
      chrome.storage.local.set({ engines }, resolve);
    });
  });
}

export async function getCustomApis(): Promise<CustomLLMConfig[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["customApis"], (result) => {
      resolve(result.customApis ?? []);
    });
  });
}

export async function saveCustomApi(config: CustomLLMConfig): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["customApis"], (result) => {
      const customApis = result.customApis ?? [];
      const existingIndex = customApis.findIndex((api: CustomLLMConfig) => api.name === config.name);
      if (existingIndex >= 0) {
        customApis[existingIndex] = config;
      } else {
        customApis.push(config);
      }
      chrome.storage.local.set({ customApis }, resolve);
    });
  });
}

export async function deleteCustomApi(name: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["customApis"], (result) => {
      const customApis = result.customApis ?? [];
      const filtered = customApis.filter((api: CustomLLMConfig) => api.name !== name);
      chrome.storage.local.set({ customApis: filtered }, resolve);
    });
  });
}

export type Domain = {
  id: string;
  name: string;
  prompt: string;
  builtin?: boolean;
};

export async function getDomains(): Promise<Domain[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["domains"], (result) => {
      // 初始化内置领域
      const stored = result.domains ?? [];
      const builtinIds = BUILTIN_DOMAINS.map(d => d.id);
      const hasBuiltin = (d: Domain) => builtinIds.includes(d.id);

      // 合并：使用存储的内置领域覆盖默认内置领域
      const merged = [...BUILTIN_DOMAINS];
      for (const domain of stored) {
        if (!hasBuiltin(domain)) {
          merged.push(domain);
        } else {
          // 用存储的覆盖内置的（支持编辑内置领域）
          const idx = merged.findIndex(d => d.id === domain.id);
          if (idx >= 0) merged[idx] = domain;
        }
      }
      resolve(merged);
    });
  });
}

// 内置领域定义
export const BUILTIN_DOMAINS: Domain[] = [
  {
    id: "it",
    name: "IT/技术",
    prompt: `你是一位专业的 IT 技术文档翻译专家。

核心原则：
- 保持技术术语的准确性，不随意翻译未标准化的技术名词
- 保留所有英文缩写（API、SDK、CLI、HTML、CSS 等）
- 保持代码块、命令格式、超链接的原始形式
- 技术概念只做必要翻译，不添加个人理解或解释

术语处理：
- 已有公认译名的术语使用标准译名（如"software"→"软件"）
- 无标准译名或新出现的技术术语保留原文并在首次出现处注明
- 版本号、端口号、路径等保持原样

禁止行为：
- 不解释技术概念
- 不添加"也就是说"、"也就是说"等补充说明
- 不将命令或代码翻译成描述性文字`,
    builtin: true,
  },
  {
    id: "legal",
    name: "法律",
    prompt: `你是一位专业的法律翻译专家。

核心原则：
- 使用正式法律语言，保持法律文书的严肃性和严谨性
- 保持法律条款的编号结构和层次关系
- 术语精确对应，不使用口语化表达替代法律术语

术语处理：
- 法律术语保持准确（如"plaintiff"→"原告"，"force majeure"→"不可抗力"）
- 保留法律文书中特有的引用格式和文件编号
- 机构名称、地名等专有名词保留原文

禁止行为：
- 不简化复杂的法律表述
- 不意译条款内容
- 不添加任何解释或注释`,
    builtin: true,
  },
  {
    id: "medical",
    name: "医学",
    prompt: `你是一位专业的医学翻译专家。

核心原则：
- 使用规范的医学术语，不使用口语化或日常用语
- 保持医学文献的客观、准确、专业表述风格
- 数值、剂量、单位必须精确保留

术语处理：
- 疾病名称使用国际通用命名或标准中文译名
- 药品名称优先使用通用名，必要时注明商品名
- 保留检查方法、手术名称的规范表述
- 医学缩写首次出现时保留原文

禁止行为：
- 不将专业医学表述简化为通俗解释
- 不改变任何数值或单位
- 不添加健康建议或医疗指导性内容`,
    builtin: true,
  },
  {
    id: "finance",
    name: "金融",
    prompt: `你是一位专业的金融翻译专家。

核心原则：
- 保留金融领域的专业术语和缩略语（IPO、ETF、P/E、ROE 等）
- 数值、货币符号、百分比保持完全准确
- 使用专业的金融表述风格

术语处理：
- 金融工具名称保持规范译名（如"bond"→"债券"，"futures"→"期货"）
- 保留原货币符号（$、€、¥ 等）及金额数字
- 会计术语使用标准表达
- 保留财务报表的格式和结构

禁止行为：
- 不四舍五入或改变任何数值
- 不简化专业术语
- 不添加投资建议或风险提示`,
    builtin: true,
  },
  {
    id: "gaming",
    name: "游戏",
    prompt: `你是一位专业的游戏本地化翻译专家。

核心原则：
- 保留游戏的独特语境和世界观
- 语气自然流畅，符合目标语言玩家的阅读习惯
- 游戏内专有名词（角色名、地名、技能名）保持一致

术语处理：
- 游戏特有的专有名词在首次出现时保留原文
- UI 文本简洁有力，符合游戏风格
- 保留游戏中的双关语和幽默表达，在目标语言中找到对等表达
- 俚语和口语在游戏语境下可适当本地化

禁止行为：
- 不直译游戏专有名词
- 不添加游戏机制解释
- 保持文本长度适中，避免 UI 溢出`,
    builtin: true,
  },
  {
    id: "literature",
    name: "文学",
    prompt: `你是一位专业的文学翻译专家。

核心原则：
- 保留原文的文学风格、叙事节奏和修辞手法
- 在忠实原文语义的前提下，追求目标语言的文学美感
- 人物对话应符合角色性格和时代背景

风格处理：
- 修辞手法（比喻、拟人、排比等）在目标语言中找到对等表达
- 保留原文的句式特点和节奏感
- 方言、口音等语言特征用对等的方式呈现
- 文化特有的典故和隐喻适当保留或加注

禁止行为：
- 不为追求"忠实"而牺牲文学性
- 不添加原作没有的解释或评论
- 不将文学性文本翻译成说明性文字`,
    builtin: true,
  },
];

export async function saveDomain(domain: Domain): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["domains"], (result) => {
      const domains = result.domains ?? [];
      const builtinIds = BUILTIN_DOMAINS.map(d => d.id);
      const isBuiltin = builtinIds.includes(domain.id);

      if (isBuiltin) {
        // 内置领域只更新 prompt，保留 name
        const existingIndex = domains.findIndex((d: Domain) => d.id === domain.id);
        if (existingIndex >= 0) {
          domains[existingIndex] = { ...domains[existingIndex], prompt: domain.prompt };
        } else {
          domains.push({ ...domain, builtin: true });
        }
      } else {
        // 自定义领域完整更新
        const existingIndex = domains.findIndex((d: Domain) => d.id === domain.id);
        if (existingIndex >= 0) {
          domains[existingIndex] = domain;
        } else {
          domains.push(domain);
        }
      }
      chrome.storage.local.set({ domains }, resolve);
    });
  });
}

export async function deleteDomain(id: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["domains"], (result) => {
      const domains = result.domains ?? [];
      const filtered = domains.filter((d: Domain) => d.id !== id && d.id !== "default");
      chrome.storage.local.set({ domains: filtered }, resolve);
    });
  });
}

export async function getDomainPrompt(domainId: string): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["domains"], (result) => {
      const domains = result.domains ?? [];
      const domain = domains.find((d: any) => d.id === domainId);
      resolve(domain?.prompt ?? null);
    });
  });
}
