import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ProgressBar from "./ProgressBar";

describe("ProgressBar", () => {
  it("renders with label", () => {
    render(<ProgressBar value={50} label="Processing..." />);
    expect(screen.getByText("Processing...")).toBeInTheDocument();
  });

  it("renders percentage text when value > 15", () => {
    render(<ProgressBar value={50} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("does not render percentage text when value <= 15", () => {
    const { container } = render(<ProgressBar value={10} />);
    expect(container.textContent).not.toContain("10%");
  });

  it("clamps value to 0-100 range", () => {
    render(<ProgressBar value={150} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("renders without label", () => {
    const { container } = render(<ProgressBar value={75} />);
    expect(container.querySelector("div")).toBeInTheDocument();
  });
});
