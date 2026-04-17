import { vi } from "vitest";

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
