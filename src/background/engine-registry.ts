import type { TranslateEngine } from "../shared/types";

const engines = new Map<string, TranslateEngine>();

export function registerEngine(engine: TranslateEngine) {
  engines.set(engine.name, engine);
}

export function getEngine(name: string): TranslateEngine | undefined {
  return engines.get(name);
}

export function listEngines(): TranslateEngine[] {
  return Array.from(engines.values());
}
