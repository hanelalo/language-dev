import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OptionsApp } from "../../src/options/App";

describe("OptionsApp", () => {
  it("renders domain prompt section", () => {
    render(<OptionsApp />);
    expect(screen.getByText("领域 Prompt")).toBeDefined();
  });
});
