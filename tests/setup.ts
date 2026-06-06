import { vi } from "vitest";

// jsdom doesn't implement IntersectionObserver
class MockIntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
  observe(_target: Element): void {}
  unobserve(_target: Element): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

const chrome = {
  runtime: {
    openOptionsPage: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn((keys, callback) => {
        callback({});
      }),
      set: vi.fn((data, callback) => {
        callback?.();
      }),
    },
    onChanged: {
      addListener: vi.fn(),
    },
  },
};

global.chrome = chrome;
