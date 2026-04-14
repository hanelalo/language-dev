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

// 内置领域定义（与 options 同步）
const BUILTIN_DOMAINS: Domain[] = [
  { id: "it", name: "IT/技术", prompt: "你是专业 IT 技术文档翻译专家，保持术语一致并保留缩写。", builtin: true },
  { id: "legal", name: "法律", prompt: "使用正式法律语言，保持条款与术语精确对应。", builtin: true },
  { id: "medical", name: "医学", prompt: "使用规范医学术语，避免口语化表达。", builtin: true },
  { id: "finance", name: "金融", prompt: "保留金融专有名词，强调数值与单位准确性。", builtin: true },
  { id: "gaming", name: "游戏", prompt: "保留游戏语境和术语，语气自然且可读。", builtin: true },
  { id: "literature", name: "文学", prompt: "优先保留文风和修辞，同时确保语义忠实。", builtin: true },
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
