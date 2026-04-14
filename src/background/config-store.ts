import type { Settings } from "../shared/types";
import { DEFAULT_SETTINGS } from "../shared/storage-schema";

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

export async function getDomainPrompt(domainId: string): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["domains"], (result) => {
      const domains = result.domains ?? [];
      const domain = domains.find((d: any) => d.id === domainId);
      resolve(domain?.prompt ?? null);
    });
  });
}
