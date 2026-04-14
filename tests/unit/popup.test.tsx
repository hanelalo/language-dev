import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PopupApp } from "../../src/popup/App";

// Mock chrome.runtime API
const mockOnMessage = {
  addListener: vi.fn(),
  removeListener: vi.fn(),
};

Object.defineProperty(chrome.runtime, "onMessage", {
  get: () => mockOnMessage,
  configurable: true,
});

describe("PopupApp", () => {
  it("renders translate button", () => {
    render(<PopupApp />);
    expect(screen.getByText("翻译当前页")).toBeDefined();
  });
});
