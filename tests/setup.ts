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
  },
};

global.chrome = chrome;
