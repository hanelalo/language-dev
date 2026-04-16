import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OptionsApp } from "../../src/options/App";

// Mock chrome API
Object.defineProperty(chrome, "storage", {
  value: {
    local: {
      get: (_keys: string[], callback: (result: Record<string, unknown>) => void) => callback({}),
      set: (_data: Record<string, unknown>, callback?: () => void) => callback?.(),
    },
  },
  configurable: true,
});

describe("OptionsApp", () => {
  it("renders translation settings section", () => {
    render(<OptionsApp />);
    expect(screen.getByText("翻译设置")).toBeDefined();
  });

  it("renders glossary pre-scan toggle", () => {
    render(<OptionsApp />);
    expect(screen.getAllByLabelText("术语表预扫描")[0]).toBeDefined();
  });
});
